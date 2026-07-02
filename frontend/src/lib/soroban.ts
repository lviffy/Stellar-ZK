import { Contract, rpc, TransactionBuilder, Account, Networks, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";
import { SOROBAN_RPC_URL } from "./contracts";

const server = new rpc.Server(SOROBAN_RPC_URL);

export interface SorobanCallResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Invoke a Soroban smart contract method with Freighter wallet signing.
 * No mock fallbacks — transactions either succeed on-chain or report real errors.
 */
export async function invokeSorobanContract(
  contractId: string,
  methodName: string,
  args: any[],
  userAddress: string
): Promise<SorobanCallResult> {
  try {
    console.log(`Invoking contract: ${contractId}, method: ${methodName}, user: ${userAddress}`);
    
    // 1. Fetch account info to get sequence number
    let account: Account;
    try {
      const accountInfo = await server.getAccount(userAddress);
      account = new Account(userAddress, accountInfo.sequenceNumber());
    } catch (e: any) {
      console.error("Failed to fetch account from Soroban RPC:", e?.message || e);
      return {
        success: false,
        error: `Account not found on testnet. Make sure ${userAddress.slice(0, 8)}... is funded via friendbot.`
      };
    }

    const contract = new Contract(contractId);
    
    // 2. Build contract invocation
    const scArgs = args.map(arg => {
      if (arg && typeof arg === "object" && typeof arg.toXDR === "function") {
        return arg;
      }
      return nativeToScVal(arg);
    });
    const operation = contract.call(methodName, ...scArgs);
    
    const tx = new TransactionBuilder(account, {
      fee: "100000", // 100k stroops
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    // 3. Simulate first to get resource estimates and check for errors
    console.log("Simulating transaction...");
    const simResponse = await server.simulateTransaction(tx);
    
    if (!rpc.Api.isSimulationSuccess(simResponse)) {
      const simError = 'error' in simResponse 
        ? (typeof simResponse.error === 'string' ? simResponse.error : JSON.stringify(simResponse.error))
        : "Simulation failed";
      console.error("Transaction simulation failed:", simError);
      return {
        success: false,
        error: `Simulation failed: ${simError}`
      };
    }

    // 4. Assemble the transaction with simulation results (resource estimates, auth)
    const assembledTx = rpc.assembleTransaction(tx, simResponse).build();
    const xdrString = assembledTx.toXDR();
    console.log("Transaction assembled successfully, requesting Freighter signature...");

    // 5. Request Freighter signing
    const result = await signTransaction(xdrString, {
      networkPassphrase: "Test SDF Network ; September 2015"
    });
    if (!result || !result.signedTxXdr) {
      return {
        success: false,
        error: "User rejected the transaction in Freighter."
      };
    }

    console.log("Freighter signature retrieved! Submitting to Soroban RPC...");
    
    // 6. Submit signed transaction
    const signedTx = TransactionBuilder.fromXDR(result.signedTxXdr, Networks.TESTNET);
    const sendResponse = await server.sendTransaction(signedTx);
    
    if (sendResponse.status === "ERROR") {
      const errorDetail = sendResponse.errorResult?.toXDR("base64") || "Unknown submission error";
      console.error("Transaction submission error:", errorDetail);
      return {
        success: false,
        error: `Submission error: ${errorDetail}`
      };
    }

    // 7. Poll for transaction result (sendTransaction returns PENDING)
    console.log(`Transaction submitted: ${sendResponse.hash}. Polling for result...`);
    const txHash = sendResponse.hash;
    
    let getResponse = await server.getTransaction(txHash);
    const maxAttempts = 30; // 30 seconds max wait
    let attempts = 0;
    
    while (getResponse.status === "NOT_FOUND" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      getResponse = await server.getTransaction(txHash);
      attempts++;
    }

    if (getResponse.status === "SUCCESS") {
      console.log("Transaction confirmed on-chain:", txHash);
      return {
        success: true,
        txHash
      };
    } else if (getResponse.status === "FAILED") {
      console.error("Transaction failed on-chain:", getResponse);
      return {
        success: false,
        txHash,
        error: "Transaction failed on-chain. The contract may have rejected the vote (e.g. already voted, invalid proof)."
      };
    } else {
      console.warn("Transaction status unknown after polling:", getResponse.status);
      return {
        success: false,
        txHash,
        error: `Transaction status: ${getResponse.status}. It may still be processing.`
      };
    }
  } catch (err: any) {
    console.error("Soroban call failed:", err);
    return {
      success: false,
      error: err.message || "Failed to invoke Soroban contract"
    };
  }
}

export async function getTallyFromSoroban(
  contractId: string,
  proposalId: number
): Promise<[number, number] | null> {
  try {
    const dummySource = "GBPZ7ALCHBFXF7FNSACMJ2LSMATYPX7J6UNHEKOP6N7GPWZOYKGHJRSK";
    const account = new Account(dummySource, "0");
    const contract = new Contract(contractId);
    const operation = contract.call("get_tally", nativeToScVal(BigInt(proposalId)));

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const response = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationSuccess(response) && response.result?.retval) {
      const val = scValToNative(response.result.retval);
      if (Array.isArray(val) && val.length === 2) {
        return [Number(val[0]), Number(val[1])];
      }
    }
    return null;
  } catch (err: any) {
    console.warn(`Failed to get tally for proposal ${proposalId} from Soroban RPC:`, err?.message || err);
    return null;
  }
}

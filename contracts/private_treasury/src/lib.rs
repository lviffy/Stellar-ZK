#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, token, Address, Bytes, BytesN, Env, Symbol,
};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};
use risc0_interface::RiscZeroVerifierClient;

#[contract]
pub struct PrivateTreasuryContract;

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    VkInvalidLength = 3,
    VkInvalidParameters = 4,
    ProofParseError = 5,
    VerificationFailed = 6,
    Risc0VerificationFailed = 7,
    CommitmentNotFound = 8,
    CommitmentAlreadyClaimed = 9,
    InvalidJournalLength = 10,
    InvalidJournalData = 11,
    InsufficientFunds = 12,
    InvalidPublicInputsLength = 13,
}

#[contractimpl]
impl PrivateTreasuryContract {
    // Storage keys
    fn key_token() -> Symbol {
        symbol_short!("token")
    }
    fn key_zk_credential() -> Symbol {
        symbol_short!("zk_cred")
    }
    fn key_risc0_verifier() -> Symbol {
        symbol_short!("r0_ver")
    }
    fn key_risc0_image_id() -> Symbol {
        symbol_short!("r0_img")
    }
    fn key_noir_vk() -> Symbol {
        symbol_short!("noir_vk")
    }

    pub fn initialize(
        env: Env,
        token: Address,
        zk_credential: Address,
        risc0_verifier: Address,
        risc0_image_id: BytesN<32>,
        noir_vk: Bytes,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&Self::key_token()) {
            return Err(Error::AlreadyInitialized);
        }

        // Validate Noir VK
        let _ = UltraHonkVerifier::new(&env, &noir_vk).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;

        env.storage().instance().set(&Self::key_token(), &token);
        env.storage().instance().set(&Self::key_zk_credential(), &zk_credential);
        env.storage().instance().set(&Self::key_risc0_verifier(), &risc0_verifier);
        env.storage().instance().set(&Self::key_risc0_image_id(), &risc0_image_id);
        env.storage().instance().set(&Self::key_noir_vk(), &noir_vk);

        Ok(())
    }

    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        let token_addr: Address = env.storage().instance().get(&Self::key_token()).ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&env, &token_addr);
        
        token_client.transfer(&from, &env.current_contract_address(), &amount);
        Ok(())
    }

    pub fn execute_payroll(
        env: Env,
        risc0_seal: Bytes,
        journal_bytes: Bytes,
        amount_commitments: soroban_sdk::Vec<Bytes>,
    ) -> Result<(), Error> {
        // 1. Load verifier config
        let risc0_verifier: Address = env.storage().instance().get(&Self::key_risc0_verifier()).ok_or(Error::NotInitialized)?;
        let risc0_image_id: BytesN<32> = env.storage().instance().get(&Self::key_risc0_image_id()).ok_or(Error::NotInitialized)?;

        // 2. Verify RISC Zero proof
        if journal_bytes.len() != 80 {
            return Err(Error::InvalidJournalLength);
        }

        let journal_digest = env.crypto().sha256(&journal_bytes);
        let journal_digest_bytes: BytesN<32> = journal_digest.into();
        
        let r0_client = RiscZeroVerifierClient::new(&env, &risc0_verifier);
        r0_client.verify(&risc0_seal, &risc0_image_id, &journal_digest_bytes);

        // 3. Parse journal bytes
        // Layout:
        // [0..32]   - merkle_root
        // [32..40]  - budget_cap (u64)
        // [40..48]  - total_amount (u64)
        // [48..80]  - recipients_hash
        let total_amount_bytes = journal_bytes.slice(40..48);
        let mut total_amount_arr = [0u8; 8];
        total_amount_bytes.copy_into_slice(&mut total_amount_arr);
        let total_amount = u64::from_be_bytes(total_amount_arr);

        // 4. Verify treasury has enough funds
        let token_addr: Address = env.storage().instance().get(&Self::key_token()).ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&env, &token_addr);
        let balance = token_client.balance(&env.current_contract_address());
        if balance < (total_amount as i128) {
            return Err(Error::InsufficientFunds);
        }

        // 5. Store commitments on-chain
        for commitment in amount_commitments.iter() {
            // Store as pending (true = unclaimed)
            env.storage().persistent().set(&commitment, &true);
        }

        Ok(())
    }

    pub fn claim_salary(
        env: Env,
        proof_bytes: Bytes,
        public_inputs: Bytes, // [0..32] recipient_pub_key_hash, [32..64] amount_commitment
        claimant_address: Address,
        amount: u64,
    ) -> Result<(), Error> {
        if proof_bytes.len() as usize != PROOF_BYTES {
            return Err(Error::ProofParseError);
        }

        if public_inputs.len() != 64 {
            return Err(Error::InvalidPublicInputsLength);
        }

        let amount_commitment = public_inputs.slice(32..64);

        // 1. Verify commitment exists and is unclaimed
        if !env.storage().persistent().has(&amount_commitment) {
            return Err(Error::CommitmentNotFound);
        }
        let is_unclaimed: bool = env.storage().persistent().get(&amount_commitment).unwrap();
        if !is_unclaimed {
            return Err(Error::CommitmentAlreadyClaimed);
        }

        // 2. Verify Noir proof
        let noir_vk: Bytes = env.storage().instance().get(&Self::key_noir_vk()).ok_or(Error::NotInitialized)?;
        let verifier = UltraHonkVerifier::new(&env, &noir_vk).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;

        verifier
            .verify(&env, &proof_bytes, &public_inputs)
            .map_err(|_| Error::VerificationFailed)?;

        // 3. Mark commitment as claimed (false)
        env.storage().persistent().set(&amount_commitment, &false);

        // 4. Transfer tokens to claimant
        let token_addr: Address = env.storage().instance().get(&Self::key_token()).ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&env, &token_addr);
        token_client.transfer(&env.current_contract_address(), &claimant_address, &(amount as i128));

        Ok(())
    }
}

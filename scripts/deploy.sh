#!/bin/bash
set -euo pipefail

# ==============================================================================
# Stellar-ZK Contract Deployment Script
# Deploys: zk_credential, private_governance, private_treasury to Testnet
# Usage:  bash scripts/deploy.sh
# ==============================================================================

STELLAR="/home/lviffy/.local/bin/stellar"
NETWORK="testnet"
WASM_DIR="target/wasm32v1-none/release"
FRONTEND_ENV="frontend/.env.local"
CONTRACTS_TS="frontend/src/lib/contracts.ts"

# ---------------------------------------------------------------------------
# Load environment variables from .env file if it exists
# ---------------------------------------------------------------------------
if [ -f ".env" ]; then
    echo "▸ Loading environment variables from .env..."
    # Export vars, ignoring comments
    export $(grep -v '^#' .env | xargs)
fi

DEPLOYER_SECRET="${DEPLOYER_SECRET:-}"
if [ -z "$DEPLOYER_SECRET" ]; then
    echo "ERROR: DEPLOYER_SECRET is not set. Please set it in your environment or a .env file."
    exit 1
fi
DEPLOYER_ALIAS="stellar-zk-deployer"

echo ""
echo "============================================================"
echo "         Stellar-ZK Testnet Deployment"
echo "============================================================"
echo ""

echo "[1] Registering deployer key as '$DEPLOYER_ALIAS'..."
echo "$DEPLOYER_SECRET" | "$STELLAR" keys add "$DEPLOYER_ALIAS" --secret-key --overwrite 2>&1 || true

DEPLOYER_PUBKEY=$("$STELLAR" keys address "$DEPLOYER_ALIAS" 2>&1)
echo "    Public key : $DEPLOYER_PUBKEY"

# ---------------------------------------------------------------------------
# Check account funded on testnet
# ---------------------------------------------------------------------------
echo ""
echo "[2] Checking account balance on testnet..."
ACCOUNT_JSON=$(curl -sf "https://horizon-testnet.stellar.org/accounts/$DEPLOYER_PUBKEY" 2>/dev/null || echo "NOT_FOUND")
if echo "$ACCOUNT_JSON" | grep -q "NOT_FOUND\|Resource Missing\|type.*problem"; then
    echo "    Account not found — funding via Friendbot..."
    curl -sf "https://friendbot.stellar.org/?addr=$DEPLOYER_PUBKEY" > /dev/null
    echo "    Funded with testnet XLM!"
else
    echo "    Account is active."
fi

# ---------------------------------------------------------------------------
# Build WASM contracts
# ---------------------------------------------------------------------------
echo ""
echo "[3] Building Soroban contracts (release + wasm32v1-none)..."
cargo build \
    --package zk_credential \
    --package private_governance \
    --package private_treasury \
    --target wasm32v1-none \
    --release 2>&1

for wasm in zk_credential private_governance private_treasury; do
    WASM_PATH="$WASM_DIR/${wasm}.wasm"
    if [ ! -f "$WASM_PATH" ]; then
        echo "ERROR: $WASM_PATH not found after build"
        exit 1
    fi
    echo "    OK: ${wasm}.wasm ($(wc -c < "$WASM_PATH") bytes)"
done

# ---------------------------------------------------------------------------
# Build a structurally valid 1760-byte UltraHonk VK placeholder.
#
# Layout (from ultrahonk-soroban-verifier/src/utils.rs):
#   4 x u64 big-endian header  (32 bytes)
#   27 x 64-byte G1 points     (1728 bytes)
#   Total = 1760 bytes
#
# Validation rules (load_vk_from_bytes):
#   log_circuit_size ∈ [1, 28]
#   circuit_size == 2 ^ log_circuit_size
#   public_inputs_size >= 16  (PAIRING_POINTS_SIZE)
#   pub_inputs_offset <= circuit_size
# ---------------------------------------------------------------------------
echo ""
echo "[4] Generating valid UltraHonk VK placeholder (1760 bytes)..."

# Header: circuit_size=8, log_circuit_size=3, public_inputs_size=16, pub_inputs_offset=1
VK_HEADER="0000000000000008000000000000000300000000000000100000000000000001"
# 27 G1 points, all zeros (point at infinity is valid on BN254)
VK_POINTS=$(python3 -c "print('00' * 27 * 64)")
DUMMY_VK_HEX="${VK_HEADER}${VK_POINTS}"

VK_BYTE_LEN=$(( ${#DUMMY_VK_HEX} / 2 ))
echo "    VK hex length: $VK_BYTE_LEN bytes (expected 1760)"
if [ "$VK_BYTE_LEN" -ne 1760 ]; then
    echo "ERROR: VK length mismatch!"
    exit 1
fi

# ---------------------------------------------------------------------------
# STEP A: Deploy zk_credential  (constructor takes vk_bytes)
# ---------------------------------------------------------------------------
echo ""
echo "[5] Deploying zk_credential..."
ZK_CRED_RAW=$("$STELLAR" contract deploy \
    --wasm "$WASM_DIR/zk_credential.wasm" \
    --source "$DEPLOYER_ALIAS" \
    --network "$NETWORK" \
    -- \
    --vk_bytes "$DUMMY_VK_HEX" 2>&1)
echo "$ZK_CRED_RAW"
# Extract the contract address (last non-empty line, 56 chars, starts with C)
ZK_CRED_ID=$(echo "$ZK_CRED_RAW" | grep -oE 'C[A-Z0-9]{55}' | tail -1)

if [ -z "$ZK_CRED_ID" ]; then
    echo "ERROR: Could not extract zk_credential contract address"
    exit 1
fi
echo "    zk_credential    : $ZK_CRED_ID"

# ---------------------------------------------------------------------------
# STEP B: Deploy private_governance + initialize
# ---------------------------------------------------------------------------
echo ""
echo "[6] Deploying private_governance..."
GOV_RAW=$("$STELLAR" contract deploy \
    --wasm "$WASM_DIR/private_governance.wasm" \
    --source "$DEPLOYER_ALIAS" \
    --network "$NETWORK" 2>&1)
echo "$GOV_RAW"
GOV_ID=$(echo "$GOV_RAW" | grep -oE 'C[A-Z0-9]{55}' | tail -1)

if [ -z "$GOV_ID" ]; then
    echo "ERROR: Could not extract private_governance contract address"
    exit 1
fi
echo "    private_governance: $GOV_ID"

echo "    Initializing private_governance..."
"$STELLAR" contract invoke \
    --id "$GOV_ID" \
    --source "$DEPLOYER_ALIAS" \
    --network "$NETWORK" \
    -- initialize \
    --zk_credential "$ZK_CRED_ID" \
    --vk '{
        "alpha": "00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002",
        "beta":  "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002",
        "gamma": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002",
        "delta": "0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002",
        "ic": []
    }' 2>&1
echo "    initialized."

# ---------------------------------------------------------------------------
# STEP C: Deploy private_treasury + initialize
# ---------------------------------------------------------------------------
echo ""
echo "[7] Deploying private_treasury..."
TREASURY_RAW=$("$STELLAR" contract deploy \
    --wasm "$WASM_DIR/private_treasury.wasm" \
    --source "$DEPLOYER_ALIAS" \
    --network "$NETWORK" 2>&1)
echo "$TREASURY_RAW"
TREASURY_ID=$(echo "$TREASURY_RAW" | grep -oE 'C[A-Z0-9]{55}' | tail -1)

if [ -z "$TREASURY_ID" ]; then
    echo "ERROR: Could not extract private_treasury contract address"
    exit 1
fi
echo "    private_treasury  : $TREASURY_ID"

# Native XLM SAC address on Testnet
NATIVE_XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
DUMMY_IMAGE_ID="0000000000000000000000000000000000000000000000000000000000000000"

echo "    Initializing private_treasury..."
"$STELLAR" contract invoke \
    --id "$TREASURY_ID" \
    --source "$DEPLOYER_ALIAS" \
    --network "$NETWORK" \
    -- initialize \
    --token "$NATIVE_XLM_SAC" \
    --zk_credential "$ZK_CRED_ID" \
    --risc0_verifier "$ZK_CRED_ID" \
    --risc0_image_id "$DUMMY_IMAGE_ID" \
    --noir_vk "$DUMMY_VK_HEX" 2>&1
echo "    initialized."

# ---------------------------------------------------------------------------
# Update frontend config
# ---------------------------------------------------------------------------
echo ""
echo "[8] Writing frontend configuration..."

cat > "$CONTRACTS_TS" << TSEOF
// Auto-generated by scripts/deploy.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
// Network: Testnet  |  Deployer: $DEPLOYER_PUBKEY
export const ZK_CREDENTIAL_ID = process.env.NEXT_PUBLIC_ZK_CREDENTIAL_ID || "$ZK_CRED_ID";
export const PRIVATE_GOVERNANCE_ID = process.env.NEXT_PUBLIC_PRIVATE_GOVERNANCE_ID || "$GOV_ID";
export const PRIVATE_TREASURY_ID = process.env.NEXT_PUBLIC_PRIVATE_TREASURY_ID || "$TREASURY_ID";

export const STELLAR_NETWORK = "TESTNET";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
TSEOF

cat > "$FRONTEND_ENV" << ENVEOF
# Auto-generated by scripts/deploy.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
NEXT_PUBLIC_ZK_CREDENTIAL_ID=$ZK_CRED_ID
NEXT_PUBLIC_PRIVATE_GOVERNANCE_ID=$GOV_ID
NEXT_PUBLIC_PRIVATE_TREASURY_ID=$TREASURY_ID
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
ENVEOF

echo "    Updated : $CONTRACTS_TS"
echo "    Created : $FRONTEND_ENV"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================================"
echo "            DEPLOYMENT COMPLETE"
echo "============================================================"
echo "  zk_credential      : $ZK_CRED_ID"
echo "  private_governance : $GOV_ID"
echo "  private_treasury   : $TREASURY_ID"
echo ""
echo "  Explorer: https://stellar.expert/explorer/testnet/contract/$ZK_CRED_ID"
echo "============================================================"
echo ""

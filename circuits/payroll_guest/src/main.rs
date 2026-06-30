#![no_main]
use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};
use light_poseidon::{Poseidon, PoseidonHasher};
use ark_bn254::Fr;
use ark_ff::{PrimeField, BigInteger};
use sha2::Digest;

risc0_zkvm::guest::entry!(main);

#[derive(Serialize, Deserialize)]
struct PayrollInput {
    merkle_root: [u8; 32],
    budget_cap: u64,
    recipients: Vec<[u8; 32]>,
    amounts: Vec<u64>,
    merkle_paths: Vec<Vec<[u8; 32]>>,
    merkle_indices: Vec<u32>,
}

#[derive(Serialize, Deserialize)]
struct PayrollJournal {
    merkle_root: [u8; 32],
    budget_cap: u64,
    total_amount: u64,
    recipients_hash: [u8; 32],
}

fn main() {
    // 1. Read input from host
    let input: PayrollInput = env::read();

    // 2. Basic validations
    let n = input.recipients.len();
    assert_eq!(n, input.amounts.len(), "Recipients and amounts length mismatch");
    assert_eq!(n, input.merkle_paths.len(), "Recipients and merkle paths length mismatch");
    assert_eq!(n, input.merkle_indices.len(), "Recipients and merkle indices length mismatch");

    // 3. Sum salaries and verify budget cap
    let mut total_amount: u64 = 0;
    for &amount in &input.amounts {
        total_amount = total_amount.checked_add(amount).expect("Amount overflow");
    }
    assert!(total_amount <= input.budget_cap, "Total amount exceeds budget cap");

    // 4. Verify Merkle membership proofs for all recipients
    let mut poseidon = Poseidon::<Fr>::new_circom(2).expect("Failed to initialize Poseidon");

    for i in 0..n {
        let leaf = input.recipients[i];
        let path = &input.merkle_paths[i];
        let index = input.merkle_indices[i];

        let mut current_hash = leaf;
        let mut idx = index;

        for &sibling in path {
            let left_val = Fr::from_be_bytes_mod_order(&current_hash);
            let right_val = Fr::from_be_bytes_mod_order(&sibling);

            let hash_input = if idx % 2 == 1 {
                vec![right_val, left_val]
            } else {
                vec![left_val, right_val]
            };

            let hash_result = poseidon.hash(&hash_input).expect("Poseidon hash failed");
            
            // Convert Fr to [u8; 32]
            let mut hash_bytes = [0u8; 32];
            hash_bytes.copy_from_slice(&hash_result.into_bigint().to_bytes_be());
            current_hash = hash_bytes;
            
            idx /= 2;
        }
        assert_eq!(current_hash, input.merkle_root, "Recipient not in credential allowlist");
    }

    // 5. Commit public journal as a flat 80-byte array (big-endian)
    // Layout:
    // [0..32]   - merkle_root
    // [32..40]  - budget_cap (u64)
    // [40..48]  - total_amount (u64)
    // [48..80]  - recipients_hash
    let mut journal_bytes = [0u8; 80];
    journal_bytes[0..32].copy_from_slice(&input.merkle_root);
    journal_bytes[32..40].copy_from_slice(&input.budget_cap.to_be_bytes());
    journal_bytes[40..48].copy_from_slice(&total_amount.to_be_bytes());
    
    let mut sha = sha2::Sha256::new();
    for recipient in &input.recipients {
        sha.update(recipient);
    }
    let recipients_hash: [u8; 32] = sha.finalize().into();
    journal_bytes[48..80].copy_from_slice(&recipients_hash);

    env::commit(&journal_bytes);
}

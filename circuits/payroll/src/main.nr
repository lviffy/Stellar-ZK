use std::hash::Hasher;
use poseidon::poseidon2::Poseidon2Hasher;

fn poseidon2_hash_2(x: Field, y: Field) -> Field {
    let mut hasher = Poseidon2Hasher::default();
    hasher.write(x);
    hasher.write(y);
    hasher.finish()
}

fn main(
    // Private Inputs
    amount: u64,
    randomness: Field,

    // Public Inputs
    recipient: pub Field,
    amount_commitment: pub Field
) {
    // 1. Ensure amount is non-zero (valid payment)
    assert(amount > 0);

    // 2. Verify that amount_commitment is Poseidon(amount, randomness)
    let computed_commitment = poseidon2_hash_2(amount as Field, randomness);
    assert(amount_commitment == computed_commitment);
}

#[test]
fn test_valid_payroll_proof() {
    let amount = 1000u64;
    let randomness = 987654321;
    let recipient = 123456;
    let amount_commitment = poseidon2_hash_2(amount as Field, randomness);

    main(
        amount,
        randomness,
        recipient,
        amount_commitment
    );
}

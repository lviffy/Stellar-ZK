use merkle::check_membership;
use std::hash::Hasher;

fn main(
    // Private Inputs
    balance: u64,
    age: u8,
    user_secret: Field,
    merkle_path: [Field; 8],
    merkle_index: Field,

    // Public Inputs
    balance_threshold: pub u64,
    age_threshold: pub u8,
    merkle_root: pub Field,
    nullifier: pub Field,
    pub_key_hash: pub Field
) {
    // 1. Balance Check
    assert(balance >= balance_threshold);

    // 2. Age Check
    assert(age >= age_threshold);

    // 3. Nullifier & PubKeyHash Generation
    assert(nullifier == poseidon::poseidon::bn254::hash_2([user_secret, 0]));
    assert(pub_key_hash == poseidon::poseidon::bn254::hash_2([user_secret, 1]));

    // 4. Merkle Membership Proof
    // Note: check_membership uses Poseidon2Hasher, we keep it if it's the same, or we can use Poseidon.
    // Wait, the check_membership function in merkle library uses Poseidon2Hasher by default or Poseidon?
    // In main.nr: check_membership::<8, Poseidon2Hasher>(...)
    // Let's keep check_membership as is if we don't want to change the Merkle tree.
    // But wait! If the Merkle tree uses Poseidon2, that's fine because the voting circuit doesn't check the Merkle proof, it only checks the nullifier.
    let is_member = check_membership::<8, poseidon::poseidon2::Poseidon2Hasher>(pub_key_hash, merkle_index, merkle_path, merkle_root);
    assert(is_member);
}

#[test]
fn test_valid_credential() {
    let user_secret = 12345;
    let nullifier = poseidon::poseidon::bn254::hash_2([user_secret, 0]);
    let pub_key_hash = poseidon::poseidon::bn254::hash_2([user_secret, 1]);

    // Simple Merkle tree of depth 8 with all 0s except the leaf at index 0
    let merkle_path = [0; 8];
    let merkle_index = 0;

    // Compute expected root for a tree of depth 8 where index 0 is pub_key_hash and all siblings are 0
    let mut current = pub_key_hash;
    for _i in 0..8 {
        let mut hasher = poseidon::poseidon2::Poseidon2Hasher::default();
        hasher.write(current);
        hasher.write(0);
        current = hasher.finish();
    }
    let merkle_root = current;

    main(
        1000,          // balance
        20,            // age
        user_secret,
        merkle_path,
        merkle_index,
        500,           // balance_threshold
        18,            // age_threshold
        merkle_root,
        nullifier,
        pub_key_hash
    );
}

use std::hash::Hasher;
use poseidon::poseidon2::Poseidon2Hasher;
use merkle::check_membership;

fn poseidon2_hash_2(x: Field, y: Field) -> Field {
    let mut hasher = Poseidon2Hasher::default();
    hasher.write(x);
    hasher.write(y);
    hasher.finish()
}

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
    assert(nullifier == poseidon2_hash_2(user_secret, 0));
    assert(pub_key_hash == poseidon2_hash_2(user_secret, 1));

    // 4. Merkle Membership Proof
    let is_member = check_membership::<8, Poseidon2Hasher>(pub_key_hash, merkle_index, merkle_path, merkle_root);
    assert(is_member);
}

#[test]
fn test_valid_credential() {
    let user_secret = 12345;
    let nullifier = poseidon2_hash_2(user_secret, 0);
    let pub_key_hash = poseidon2_hash_2(user_secret, 1);

    // Simple Merkle tree of depth 8 with all 0s except the leaf at index 0
    let mut merkle_path = [0; 8];
    let merkle_index = 0;

    // Compute expected root for a tree of depth 8 where index 0 is pub_key_hash and all siblings are 0
    let mut current = pub_key_hash;
    for _i in 0..8 {
        current = poseidon2_hash_2(current, 0);
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

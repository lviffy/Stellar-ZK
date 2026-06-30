extern crate std;

use soroban_sdk::{
    Env, BytesN,
    crypto::bn254::{Bn254G1Affine, Bn254G2Affine},
    testutils::Address as _,
};

use crate::{
    PrivateGovernanceContract, PrivateGovernanceContractClient,
    VerificationKey, Groth16Proof,
};

// ============================================================
// Constants: real Groth16 proof over voting circuit
// Generated via circuits/circom/voting/generate_proof.js
// circuit: user_secret=12345, proposal_id=1, vote_choice=1(Yes)
// ============================================================

fn hex32(h: &str) -> [u8; 32] {
    let h = h.trim_start_matches("0x");
    let mut out = [0u8; 32];
    for i in 0..32 {
        out[i] = u8::from_str_radix(&h[i * 2..i * 2 + 2], 16).unwrap();
    }
    out
}

fn g1(env: &Env, x: &str, y: &str) -> Bn254G1Affine {
    let mut bytes = [0u8; 64];
    bytes[..32].copy_from_slice(&hex32(x));
    bytes[32..].copy_from_slice(&hex32(y));
    Bn254G1Affine::from_array(env, &bytes)
}

fn g2(env: &Env, x0: &str, x1: &str, y0: &str, y1: &str) -> Bn254G2Affine {
    // Note: snarkjs gives coefficients in (x[1], x[0]) order for Fq2 extension field
    // Soroban expects them as [x_im, x_re, y_im, y_re] concatenated
    let mut bytes = [0u8; 128];
    bytes[0..32].copy_from_slice(&hex32(x0));
    bytes[32..64].copy_from_slice(&hex32(x1));
    bytes[64..96].copy_from_slice(&hex32(y0));
    bytes[96..128].copy_from_slice(&hex32(y1));
    Bn254G2Affine::from_array(env, &bytes)
}

fn make_proof(env: &Env) -> Groth16Proof {
    Groth16Proof {
        a: g1(env,
            "0x01536fdd8b053cabc8f52db8c827ad0b3c13fa49597777e54d17ffb17e42a527",
            "0x050e3f8377f2a2f6b1cc48fb8e3140ec66071d6346d36bc1d10e5e716f5229c9"),
        b: g2(env,
            "0x18c3b45cfa98aef3581a673a5ed70af69856dca4de1590a5157af317837ae39e",
            "0x0f379b4080ec3f4e07d6dcdf96b72802d00685fa49e3c88b0e808a921ce28ba5",
            "0x1c0d7d8b5cfd70e16d7d0eb6797cdd6d0bc4f0054a316d5737443591dcf43d6c",
            "0x2cf3e999638884d725efc4ee727e75f1545599ccc8ebc8c954eea5eab8a208a4"),
        c: g1(env,
            "0x072280065bee6ed6a96cd78a6792e7b00385f7ba0bb09092d91939415fa0712f",
            "0x12d7f48d977f1c8008eaee4ddb087fea5b8568f4eb8a9dd75ec1203ff5b0ef3a"),
    }
}

fn make_vk(env: &Env) -> VerificationKey {
    VerificationKey {
        alpha: g1(env,
            "0x2f12bff82c239730516073049236cf88bca68db1230a61418d2a9657041b032c",
            "0x09f2b7e4f3ef1374f7fac49f8655a91c79df0b311faa355082f593be082d8b33"),
        beta: g2(env,
            "0x2504b8a9cd6f90074b783cfb68186ed28a358ac4f92c2ced9b0e34e047cc4ee8",
            "0x18d1894e03e1f07e1af6d893857c2c0fa34bbd4741959b4b815c432c9e8e6cef",
            "0x0a75dfeec8d1b585054013ec81c790d004ff1e744a254c10f39b16f34f025de5",
            "0x269d168bd0c00ba7eae7be5ca9e1fd8d545ed2df4f7f49aec72429ac60723b9a"),
        gamma: g2(env,
            "0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2",
            "0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed",
            "0x090689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b",
            "0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa"),
        delta: g2(env,
            "0x26b45103b6ac900a07273867858edab29a26a08131249d4a7b72b81009452df5",
            "0x182619fa49445884f38dc832b974c41db5ce80ae105fc73376d64d08d305598b",
            "0x116dedb40d11afed5044352ea81d3715fa2db561b8ccfc45419431c53044f6fb",
            "0x2c795365a5c7c832850e40aad8df41be187d207728513bb23126ee1c8103b0e1"),
        ic: {
            let mut v = soroban_sdk::Vec::new(env);
            v.push_back(g1(env,
                "0x155ff856f2bdcf3803d2434805ee23ee329f3fe4ecbfe696ae9f3e4794ac20ea",
                "0x0546a537c452725b8e55a9f9eb659f21964e7f1e6476a40a87534b17976597ef"));
            v.push_back(g1(env,
                "0x16d03bb47c003c40a9980e2c341f2f68296212b45b42ce16143e7be6fdba6a6e",
                "0x1bf6cebdfbebe4e074e121e7fd3235882ef64e3c6443a09392d6d34c1bcb5eb3"));
            v.push_back(g1(env,
                "0x2432400451c604aa4d0f21e45a6056e7d6a4ad6a43775889a2ef8497eb219049",
                "0x0ab7ce50ed87be9fda862fb13215e578243f661357efb54a70d35e6caebd14ef"));
            v.push_back(g1(env,
                "0x1f9832a3c58950b93f48370d2213f674a307ff75a501a0ac03da676e0fc53dba",
                "0x18762e0e0808289bd763742b5520415602fe4bc64a5c3abc0dfffcfaf66b11fd"));
            v.push_back(g1(env,
                "0x03c3408a21346a46245e3e079e7dd9ab843a74222ca7b482624e211f4f636924",
                "0x2ef840ae3e7f2fa856867f40e5a40ffe194761d8020f08665b076b637c98df37"));
            v
        },
    }
}

// Setup: deploy zk_credential stub + private_governance
fn setup(env: &Env) -> PrivateGovernanceContractClient<'_> {
    // For integration tests we register a minimal mock zk_credential that always returns true.
    // In a full test we'd register ZkCredentialContract and call verify_credential.
    let governance_id = env.register(PrivateGovernanceContract, ());
    let client = PrivateGovernanceContractClient::new(env, &governance_id);

    // Use a mock address for zk_credential during the VK-only verification test
    let mock_cred = soroban_sdk::Address::generate(env);
    let vk = make_vk(env);
    client.initialize(&mock_cred, &vk);
    client
}

#[test]
fn test_double_vote_rejected() {
    // This test verifies the double-vote prevention mechanism using storage.
    // We mock credential check by registering a real credential contract.
    let env = Env::default();
    let client = setup(&env);

    // Manually mark a voting_nullifier as used to simulate a prior vote
    let voting_nullifier = BytesN::from_array(&env, &hex32("0x0950acb7e532ebb21176a28dee52617a5a37ce9294aab1cf603024e5b9063f9a"));
    let proposal_id: u64 = 1;

    // Write the voted flag directly through invocation (simulate already voted)
    env.as_contract(&client.address, || {
        let voted_key = (proposal_id, voting_nullifier.clone());
        env.storage().persistent().set(&voted_key, &true);
    });

    let cred_nullifier = BytesN::from_array(&env, &hex32("0x0132013acf7f80aa59c175babe6efacaa47cbd24f81f1be462702e8d8ca34c9d"));
    let proof = make_proof(&env);

    let result = client.try_vote(&proof, &cred_nullifier, &proposal_id, &1u32, &voting_nullifier);
    assert_eq!(result, Err(Ok(crate::Error::AlreadyVoted)));
}

#[test]
fn test_invalid_vote_choice_rejected() {
    let env = Env::default();
    let client = setup(&env);
    let proof = make_proof(&env);
    let cred = BytesN::from_array(&env, &hex32("0x0132013acf7f80aa59c175babe6efacaa47cbd24f81f1be462702e8d8ca34c9d"));
    let vn = BytesN::from_array(&env, &hex32("0x0950acb7e532ebb21176a28dee52617a5a37ce9294aab1cf603024e5b9063f9a"));

    let result = client.try_vote(&proof, &cred, &1u64, &2u32, &vn);
    assert_eq!(result, Err(Ok(crate::Error::InvalidVoteChoice)));
}

#[test]
fn test_tally_initial_is_zero() {
    let env = Env::default();
    let client = setup(&env);
    let (no, yes) = client.get_tally(&1u64);
    assert_eq!(no, 0);
    assert_eq!(yes, 0);
}

#[test]
fn test_has_voted_false_initially() {
    let env = Env::default();
    let client = setup(&env);
    let vn = BytesN::from_array(&env, &hex32("0x0950acb7e532ebb21176a28dee52617a5a37ce9294aab1cf603024e5b9063f9a"));
    assert!(!client.has_voted(&1u64, &vn));
}

#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    IntoVal, InvokeError, Symbol, Val, Vec, vec,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
};

#[contracttype]
#[derive(Clone)]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[contracttype]
#[derive(Clone)]
pub struct Groth16Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contract]
pub struct PrivateGovernanceContract;

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    VerificationFailed = 3,
    InvalidCredential = 4,
    AlreadyVoted = 5,
    InvalidVoteChoice = 6,
}

const KEY_ZK_CRED: Symbol = symbol_short!("zk_cred");
const KEY_VK: Symbol = symbol_short!("vk");

#[contractimpl]
impl PrivateGovernanceContract {
    pub fn initialize(
        env: Env,
        zk_credential: Address,
        vk: VerificationKey,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&KEY_ZK_CRED) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&KEY_ZK_CRED, &zk_credential);
        env.storage().instance().set(&KEY_VK, &vk);
        Ok(())
    }

    pub fn zk_credential(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&KEY_ZK_CRED)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_tally(env: Env, proposal_id: u64) -> (u32, u32) {
        env.storage()
            .persistent()
            .get(&proposal_id)
            .unwrap_or((0u32, 0u32))
    }

    pub fn has_voted(env: Env, proposal_id: u64, voting_nullifier: BytesN<32>) -> bool {
        let voted_key = (proposal_id, voting_nullifier);
        env.storage().persistent().has(&voted_key)
    }

    pub fn vote(
        env: Env,
        proof: Groth16Proof,
        credential_nullifier: BytesN<32>,
        proposal_id: u64,
        vote_choice: u32, // 0 = No, 1 = Yes
        voting_nullifier: BytesN<32>,
    ) -> Result<(), Error> {
        if vote_choice > 1 {
            return Err(Error::InvalidVoteChoice);
        }

        // 2. Prevent double-voting per proposal (cheap storage check first)
        let voted_key = (proposal_id, voting_nullifier.clone());
        if env.storage().persistent().has(&voted_key) {
            return Err(Error::AlreadyVoted);
        }

        // 3. Verify the voter holds a registered credential nullifier
        let zk_cred: Address = env
            .storage()
            .instance()
            .get(&KEY_ZK_CRED)
            .ok_or(Error::NotInitialized)?;
        let mut args: Vec<Val> = Vec::new(&env);
        args.push_back(credential_nullifier.clone().into_val(&env));
        let has_cred: bool = env
            .try_invoke_contract::<bool, InvokeError>(
                &zk_cred,
                &Symbol::new(&env, "has_nullifier"),
                args,
            )
            .map_err(|_| Error::InvalidCredential)?
            .map_err(|_| Error::InvalidCredential)?;
        if !has_cred {
            return Err(Error::InvalidCredential);
        }

        // 3. Verify Groth16 ZK proof
        let vk: VerificationKey = env
            .storage()
            .instance()
            .get(&KEY_VK)
            .ok_or(Error::NotInitialized)?;

        // Public signals order mirrors circuit output order:
        // [credential_nullifier, proposal_id, vote_choice, voting_nullifier]
        let mut pub_signals: Vec<Bn254Fr> = Vec::new(&env);
        pub_signals.push_back(Bn254Fr::from_bytes(credential_nullifier.clone()));

        let mut prop_bytes = [0u8; 32];
        prop_bytes[24..32].copy_from_slice(&proposal_id.to_be_bytes());
        pub_signals.push_back(Bn254Fr::from_bytes(BytesN::from_array(&env, &prop_bytes)));

        let mut choice_bytes = [0u8; 32];
        choice_bytes[28..32].copy_from_slice(&vote_choice.to_be_bytes());
        pub_signals.push_back(Bn254Fr::from_bytes(BytesN::from_array(&env, &choice_bytes)));

        pub_signals.push_back(Bn254Fr::from_bytes(voting_nullifier.clone()));

        // Pairing check: e(-A, B) * e(alpha, beta) * e(vk_x, gamma) * e(C, delta) == 1
        let bn = env.crypto().bn254();
        let mut vk_x = vk.ic.get(0).unwrap();
        for i in 0..pub_signals.len() {
            let s = pub_signals.get(i).unwrap();
            let v = vk.ic.get(i + 1).unwrap();
            let prod = bn.g1_mul(&v, &s);
            vk_x = bn.g1_add(&vk_x, &prod);
        }

        let neg_a = -proof.a;
        let g1_points = vec![&env, neg_a, vk.alpha, vk_x, proof.c];
        let g2_points = vec![&env, proof.b, vk.beta, vk.gamma, vk.delta];

        if !bn.pairing_check(g1_points, g2_points) {
            return Err(Error::VerificationFailed);
        }

        // 4. Record vote nullifier & update tally
        env.storage().persistent().set(&voted_key, &true);

        let (no_votes, yes_votes): (u32, u32) = env
            .storage()
            .persistent()
            .get(&proposal_id)
            .unwrap_or((0u32, 0u32));

        if vote_choice == 0 {
            env.storage()
                .persistent()
                .set(&proposal_id, &(no_votes + 1, yes_votes));
        } else {
            env.storage()
                .persistent()
                .set(&proposal_id, &(no_votes, yes_votes + 1));
        }

        Ok(())
    }
}

#[cfg(test)]
mod test;

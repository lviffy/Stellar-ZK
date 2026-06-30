#![no_std]
use soroban_sdk::{contract, contracterror, contractimpl, symbol_short, Bytes, Env, Symbol};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, VkLoadError, PROOF_BYTES};

#[contract]
pub struct ZkCredentialContract;

#[contracterror]
#[repr(u32)]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Error {
    VkInvalidLength = 1,
    VkInvalidParameters = 2,
    ProofParseError = 3,
    VerificationFailed = 4,
    VkNotSet = 5,
    AlreadyInitialized = 6,
    NullifierAlreadyUsed = 7,
    InvalidThreshold = 8,
    InvalidPublicInputsLength = 9,
}

#[contractimpl]
impl ZkCredentialContract {
    fn key_vk() -> Symbol {
        symbol_short!("vk")
    }

    pub fn __constructor(env: Env, vk_bytes: Bytes) -> Result<(), Error> {
        if env.storage().instance().has(&Self::key_vk()) {
            return Err(Error::AlreadyInitialized);
        }
        
        let _ = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;
        
        env.storage().instance().set(&Self::key_vk(), &vk_bytes);
        Ok(())
    }

    pub fn vk_bytes(env: Env) -> Result<Bytes, Error> {
        env.storage()
            .instance()
            .get(&Self::key_vk())
            .ok_or(Error::VkNotSet)
    }

    pub fn verify_credential(
        env: Env,
        proof_bytes: Bytes,
        public_inputs: Bytes,
        min_balance_threshold: u64,
        min_age_threshold: u32,
    ) -> Result<(), Error> {
        // 1. Verify proof length
        if proof_bytes.len() as usize != PROOF_BYTES {
            return Err(Error::ProofParseError);
        }

        // 2. Verify public inputs length (5 fields * 32 bytes = 160 bytes)
        if public_inputs.len() != 160 {
            return Err(Error::InvalidPublicInputsLength);
        }

        // 3. Load VK
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&Self::key_vk())
            .ok_or(Error::VkNotSet)?;

        let verifier = UltraHonkVerifier::new(&env, &vk_bytes).map_err(|e| match e {
            VkLoadError::WrongLength => Error::VkInvalidLength,
            VkLoadError::InvalidParameters => Error::VkInvalidParameters,
        })?;

        // 4. Cryptographic ZK Verification
        verifier
            .verify(&env, &proof_bytes, &public_inputs)
            .map_err(|_| Error::VerificationFailed)?;

        // 5. Unpack and validate public inputs
        // public_inputs layout:
        // [0..32]   - balance_threshold
        // [32..64]  - age_threshold
        // [64..96]  - merkle_root
        // [96..128] - nullifier
        // [128..160]- pub_key_hash

        let balance_bytes = public_inputs.slice(0..32);
        let age_bytes = public_inputs.slice(32..64);
        let nullifier = public_inputs.slice(96..128);
        let pub_key_hash = public_inputs.slice(128..160);

        // Decode balance_threshold (u64, big-endian in last 8 bytes of 32-byte field)
        let mut balance_arr = [0u8; 8];
        balance_bytes.slice(24..32).copy_into_slice(&mut balance_arr);
        let balance_threshold = u64::from_be_bytes(balance_arr);

        // Decode age_threshold (u8, big-endian in last byte of 32-byte field)
        let mut age_arr = [0u8; 1];
        age_bytes.slice(31..32).copy_into_slice(&mut age_arr);
        let age_threshold = age_arr[0];

        // Ensure thresholds in the proof are sufficient
        if balance_threshold < min_balance_threshold || (age_threshold as u32) < min_age_threshold {
            return Err(Error::InvalidThreshold);
        }

        // 6. Double-spending / Reuse check on Nullifier
        if env.storage().persistent().has(&nullifier) {
            return Err(Error::NullifierAlreadyUsed);
        }

        // Mark nullifier as used
        env.storage().persistent().set(&nullifier, &true);

        // Mark user's public key hash as credentialed
        env.storage().persistent().set(&pub_key_hash, &true);

        Ok(())
    }

    pub fn is_credentialed(env: Env, pub_key_hash: Bytes) -> bool {
        env.storage().persistent().has(&pub_key_hash)
    }

    pub fn has_nullifier(env: Env, nullifier: Bytes) -> bool {
        env.storage().persistent().has(&nullifier)
    }
}

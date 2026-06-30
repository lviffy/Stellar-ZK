const fs = require("fs");
const snarkjs = require("snarkjs");

async function run() {
    // 1. Inputs
    const user_secret = 12345;
    const proposal_id = 1;
    const vote_choice = 1; // Yes

    const { buildPoseidon } = require("circomlibjs");
    const poseidon = await buildPoseidon();
    
    const credential_nullifier = poseidon([user_secret, 0]);
    const voting_nullifier = poseidon([user_secret, proposal_id]);

    const input = {
        user_secret: user_secret.toString(),
        credential_nullifier: poseidon.F.toString(credential_nullifier),
        proposal_id: proposal_id.toString(),
        vote_choice: vote_choice.toString(),
        voting_nullifier: poseidon.F.toString(voting_nullifier)
    };

    console.log("Input:", input);

    // 2. Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "voting_js/voting.wasm",
        "voting_final.zkey"
    );

    const hexVal = (x) => {
        let hex = BigInt(x).toString(16);
        return "0x" + hex.padStart(64, "0");
    };

    const rustProof = `
        let proof = Groth16Proof {
            a: Bn254G1Affine::from_array(&env, [
                BytesN::from_hex(&env, "${hexVal(proof.pi_a[0])}").unwrap().into(),
                BytesN::from_hex(&env, "${hexVal(proof.pi_a[1])}").unwrap().into(),
            ]),
            b: Bn254G2Affine::from_array(&env, [
                [
                    BytesN::from_hex(&env, "${hexVal(proof.pi_b[0][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(proof.pi_b[0][0])}").unwrap().into(),
                ],
                [
                    BytesN::from_hex(&env, "${hexVal(proof.pi_b[1][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(proof.pi_b[1][0])}").unwrap().into(),
                ]
            ]),
            c: Bn254G1Affine::from_array(&env, [
                BytesN::from_hex(&env, "${hexVal(proof.pi_c[0])}").unwrap().into(),
                BytesN::from_hex(&env, "${hexVal(proof.pi_c[1])}").unwrap().into(),
            ]),
        };
    `;

    console.log("\n--- Copy-paste Proof into Rust ---");
    console.log(rustProof);

    // 3. Export Verification Key in Rust format
    const vk = JSON.parse(fs.readFileSync("verification_key.json", "utf8"));

    const rustVk = `
        let vk = VerificationKey {
            alpha: Bn254G1Affine::from_array(&env, [
                BytesN::from_hex(&env, "${hexVal(vk.vk_alpha_1[0])}").unwrap().into(),
                BytesN::from_hex(&env, "${hexVal(vk.vk_alpha_1[1])}").unwrap().into(),
            ]),
            beta: Bn254G2Affine::from_array(&env, [
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_beta_2[0][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_beta_2[0][0])}").unwrap().into(),
                ],
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_beta_2[1][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_beta_2[1][0])}").unwrap().into(),
                ]
            ]),
            gamma: Bn254G2Affine::from_array(&env, [
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_gamma_2[0][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_gamma_2[0][0])}").unwrap().into(),
                ],
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_gamma_2[1][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_gamma_2[1][0])}").unwrap().into(),
                ]
            ]),
            delta: Bn254G2Affine::from_array(&env, [
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_delta_2[0][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_delta_2[0][0])}").unwrap().into(),
                ],
                [
                    BytesN::from_hex(&env, "${hexVal(vk.vk_delta_2[1][1])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(vk.vk_delta_2[1][0])}").unwrap().into(),
                ]
            ]),
            ic: vec![
                &env,
                ${vk.IC.map(point => `Bn254G1Affine::from_array(&env, [
                    BytesN::from_hex(&env, "${hexVal(point[0])}").unwrap().into(),
                    BytesN::from_hex(&env, "${hexVal(point[1])}").unwrap().into(),
                ])`).join(",\n                ")}
            ],
        };
    `;

    console.log("\n--- Copy-paste Verification Key into Rust ---");
    console.log(rustVk);
    console.log(`
        let credential_nullifier = BytesN::from_hex(&env, "${hexVal(input.credential_nullifier)}").unwrap();
        let voting_nullifier = BytesN::from_hex(&env, "${hexVal(input.voting_nullifier)}").unwrap();
    `);
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});

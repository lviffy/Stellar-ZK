pragma circom 2.0.0;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

template PrivateVoting() {
    // Private Inputs
    signal input user_secret;

    // Public Inputs
    signal input credential_nullifier;
    signal input proposal_id;
    signal input vote_choice;
    signal input voting_nullifier;

    // 1. Verify credential nullifier
    // credential_nullifier = Poseidon(user_secret, 0)
    component hasher1 = Poseidon(2);
    hasher1.inputs[0] <== user_secret;
    hasher1.inputs[1] <== 0;
    credential_nullifier === hasher1.out;

    // 2. Verify voting nullifier (anti-double-vote)
    // voting_nullifier = Poseidon(user_secret, proposal_id)
    component hasher2 = Poseidon(2);
    hasher2.inputs[0] <== user_secret;
    hasher2.inputs[1] <== proposal_id;
    voting_nullifier === hasher2.out;

    // 3. Constrain vote_choice to be 0 or 1 (binary vote) and bind it to the proof
    vote_choice * (vote_choice - 1) === 0;
}

component main {public [credential_nullifier, proposal_id, vote_choice, voting_nullifier]} = PrivateVoting();

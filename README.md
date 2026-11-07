# Binding Vow

**A promise you cannot negotiate with tomorrow.**

Binding Vow is a self-commitment protocol on NEAR (testnet). You state a task, lock a stake of your own money on it, and receive the vow as a non-transferable NFT. A swarm of independent judge agents first turns your wording into concrete proof terms, then later checks your proof against those terms and votes commit-reveal. Finish, and you burn the NFT to redeem your full stake. Fail, or never show up, and the NFT is burned as an execution and the stake is forfeited to a destination you picked while clear-headed: a named account, or the burn address.

The product creates no motivation. It only enforces a decision you already made. That is the point, and it is also why the chain is not decoration here: a lock you can renegotiate with is not a lock, and the escrow, the verdict, and the burn all have to be outside your future self's reach.

## Live

- App: https://binding-vow-ilkokorons-projects.vercel.app
- Contract: `bindingvow.bindingvow1106.testnet` on NEAR testnet
- Judges: `judge1.bindingvow1106.testnet`, `judge2.bindingvow1106.testnet`, `judge3.bindingvow1106.testnet`

## How a vow lives and dies

1. **Intake.** You write the task in your own words. The swarm's notary rejects tasks too vague to judge (fewer than three words, or no producible artifact) and rewrites the rest into concrete proof terms: one artifact, its SHA-256 hash, submitted before the deadline, per task category.
2. **Seal.** You call `create_vow` with stake + fee attached. The contract mints you a soulbound NFT (NEP-171 views; `nft_transfer` always refuses) that carries the task, the terms, the deadline, your cancel window, and your forfeit destination.
3. **Mercy window.** For a short window you chose at creation, and only before any proof, you may cancel: stake and fee return in full and the NFT burns. Submitting proof seals the vow early.
4. **Proof.** You submit a public link plus the SHA-256 of the proof file (`submit_proof`) before the deadline.
5. **Judgment.** Three judge agents independently fetch the proof, measure it (reachability, size, hash match), apply three different published rules, and vote commit-reveal on chain.
6. **Verdict.** `finalize` counts the revealed majority. The verification fee is split among the judges who revealed, whatever the verdict.
7. **Two burns.** Passed: you call `redeem`, the NFT burns, your stake returns in full. Failed, or no proof by the deadline: anyone calls `execute`, the NFT burns, the stake is forfeited. The NFT always dies; the only question is how.

## The three pots (kept separate in code)

- **Stake.** Yours. Returns in full on success, forfeited on failure. It never pays the judges, so a failure verdict is never profitable to issue.
- **Verification fee.** Small, separate, paid to the swarm for the work of examining, whatever the verdict. If no proof is ever submitted, no judging happened and the fee is refunded on execution.
- **Forfeit destination.** Chosen by you before sealing: a named account (a friend, a rival, a charity) or the burn address. Never the swarm, never the platform.

## The judges (three rules, on purpose)

| Judge | Persona | Rule |
| --- | --- | --- |
| judge1 | Literalist | Approve only if the proof file's SHA-256 matches the committed hash exactly. |
| judge2 | Formalist | Approve if the proof is reachable and a hash was committed; checks form, not content. |
| judge3 | Skeptic | Approve only if reachable, at least 512 bytes, and the hash matches. |

Every judgment writes an open evidence report (the checker's measurements, the rule applied, the decision, the vote transactions). Judges are paid for examining, never for passing, and the failure cases below are real, recorded, and reproducible.

## Proof it works (testnet, public proofs)

The two reference vows use the live app itself as the deliverable, so anyone can re-measure the evidence:

| Vow | Story | Verdict | Finalize tx | Closing tx |
| --- | --- | --- | --- | --- |
| vow-5 | Proof hash matches the deployed page | Passed 3-0, redeemed | [6uqYmiB1...](https://explorer.testnet.near.org/transactions/6uqYmiB1pFbvDWXqZq3Y9uJMTrJi1EHoRfr3Q9ikNHQb) | [BJfqfh73...](https://explorer.testnet.near.org/transactions/BJfqfh73F69vEvz5A7pkTMfbmw56d9hkRNAy128QSrtG) |
| vow-6 | Proof hash of the wrong file committed | Failed 1-2, executed, stake burned | [Evs6i5Sg...](https://explorer.testnet.near.org/transactions/Evs6i5SgYre3a1UoARSf23rCd2ucgqiJjhHry9piLgVh) | [2drmcWxn...](https://explorer.testnet.near.org/transactions/2drmcWxndvDJz13TbG4iy7uGfB8yZGT1YEW7eAqafh1W) |

Earlier cases vow-3 (passed) and vow-4 (failed and executed) used a locally served proof and are documented in `docs/SWARM-RESULT.md`. Judge reports for all four live in this repo under `agents/reports/` and in the app under `frontend/reports/`.

## Repository layout

- `contract-vow/` - the Rust contract (near-sdk 5), with 12 unit tests covering create, cancel, pass-redeem, fail-execute, timeout, soulbound transfer, and vote integrity.
- `agents/` - the swarm in Node.js: `notary.js` (intake), `checker.js` (deterministic evidence measurement), `judge.js` (one judge, three personas by account), `swarm.js` (orchestrator), `near.js` (RPC reads via FastNEAR mirror, signing via the official near CLI keychain).
- `frontend/` - the static 4-screen app (make, my vows, proof, verdicts) with the notary and SHA-256 hashing running in the browser, live chain reads, and multi-wallet connect via NEAR Wallet Selector.
- `docs/` - build records with the full transaction evidence: `SPIKE-RESULT.md`, `CONTRACT-RESULT.md`, `SWARM-RESULT.md`, `FRONTEND-RESULT.md`.

## Run it yourself

Contract: `cd contract-vow && cargo test` for the suite; build with `cargo near build non-reproducible-wasm`.
Swarm: `cd agents && node notary.js "your task" 0.05 7` to see intake; `node swarm.js <tokenId>` to judge a vow that is in `judging` state (requires the judge keypairs in the local near CLI keychain).
Frontend: serve `frontend/` statically; it reads the live contract and needs no backend.

## Honest limitations

- Testnet only. The stake in a production version should be a stablecoin so the pain amount does not drift with token price while a vow is locked; the mechanism is unchanged.
- This build runs a **reference swarm**: one operator runs the three judge agents to prove the design end to end. It is not a decentralized judge network, and we do not call it one. In this build the same operator also holds all three judge keys, so in practice the verdicts are only as trustworthy as that operator; what is proven here is the contract design those verdicts run on. Two timing rules are enforced on chain: `finalize` cannot run until every judge has revealed or the judging window has closed (nobody can close a tally early, nobody can hold a result hostage either), and if no judge reveals at all, the vow fails by default and the verification fee returns to the owner, because no examination happened. One more boundary, stated plainly: the majority is counted over the judges who revealed, with no minimum quorum, so if only one judge ever reveals, that single vote decides the vow. Every recorded case below had all three judges reveal, but the single-vote path exists in the code and a minimum reveal quorum is roadmap work, next to judge staking and slashing. What the contract guarantees regardless of who operates the agents: votes are accepted only from the registered judge addresses (the `judges()` view lists them on chain), every commit and reveal is signed by that judge's own account, and `finalize` and `execute` are permissionless, so anyone can close the tally. Swapping the reference swarm for independent judge operators changes who runs the agents, not the design. A production swarm adds open judge registration, judge staking with slashing, and reputation scores.
- Judges verify the proof against the pre-agreed terms, not the quality of the work. Fit, not taste. The notary's job at intake is to make "fit" checkable.
- Physical-world tasks need a same-day code word in frame to block reused photos; the notary's physical template states this, and automating the code-word check is roadmap work.

## Roadmap

- **Module 2 of the same engine: human-made certification.** The swarm pointed at the past instead of the future: artists submit work plus process evidence, the swarm examines, and a passing work is minted as a certificate NFT with the open evidence trail attached. Same escrow, same commit-reveal, same rule that pay never equals pass.
- Open judge registration with staking and slashing, a minimum reveal quorum for a valid verdict, judge reputation, stablecoin stakes, code-word verification for physical proofs.

## Tracks

Built for NEAR Hackathon "Build Beyond Boundaries": **NFTs That Do Something** (the NFT is the claim on the escrowed stake and always burns, as redemption or as execution) and **AI Swarms** (a notary plus three independently ruled judge agents doing paid verification work), with **Agent Economy** as a supporting tag (agents earn escrowed fees for examinations, independent of outcomes).

## Disclosure

Binding Vow and Humanmark are two independent entries by the same author in this hackathon (the rules allow up to two projects per person, each disclosing the other). Humanmark is the human-made art certification swarm described in the roadmap above, built as its own project: contract `humanmark.bindingvow1106.testnet`, repo https://github.com/ILKokoron/humanmark.

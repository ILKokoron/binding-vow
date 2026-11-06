# Swarm agents

Three roles, all paid from the separate verification fee escrow, released
on report submission regardless of verdict.

1. Notary agent (intake): takes the user's raw to-do, rejects vague
   wording, rewrites it into concrete proof terms (what link, what file
   hash, what video, by when), and flags absurd stake-to-task mismatches.
   The user must approve the terms before the vow can seal.
2. Deterministic checkers (no LLM judgement): target URL is alive,
   submitted file hash matches, publish timestamp is before the
   deadline, daily code word present in photo or video proof.
3. Judge agents: each receives the proof bundle and the sealed terms,
   votes fit or no-fit only (never quality, never effort), commit-reveal:
   vote hash first, all revealed together, majority decides. Reports are
   stored and hashed into the verdict record so anyone can re-audit.

Demo scope: digital tasks only (repo link, deployed link, demo video).
Agents are our own scripts with genuinely different methods per role.
No claim of a decentralized third-party agent network is made.

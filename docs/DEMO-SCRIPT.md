# Demo video script (for the X post, target 60-90 seconds)

Everything shown is live on testnet. Two acts: one vow kept, one vow
broken. Both reference vows already happened on chain (vow-5 and
vow-6), so the recording can either replay them in the app's
Verdicts screen or run a fresh pair live with short deadlines.

## Act 0, the hook (0-10s)

Screen: app home. Say or caption:
"A promise you cannot negotiate with tomorrow. This is Binding Vow.
You lock your own money on your own word, and a swarm of AI judges
decides if you kept it."

## Act 1, the kept vow (10-45s)

1. Make screen: type "Deploy the Binding Vow frontend to Vercel",
   Ask the notary. Show the proof terms the notary seals.
2. Show vow-5 in My vows: PASSED. Open Verdicts for vow-5: three
   judges, three different rules, three approves, and the open
   evidence reports.
3. The close: the NFT was burned to redeem the stake. Caption:
   "Kept his word. Burned the NFT. Got his stake back."
   Explorer: finalize 6uqYmiB1pFbvDWXqZq3Y9uJMTrJi1EHoRfr3Q9ikNHQb,
   redeem BJfqfh73F69vEvz5A7pkTMfbmw56d9hkRNAy128QSrtG.

## Act 2, the broken vow (45-80s)

1. Verdicts for vow-6: same task, proof hash of the wrong file.
   Literalist reject, Formalist approve, Skeptic reject.
2. Show the executed state and the burned token. Caption:
   "Wrong proof. Majority said no. The NFT burned as an execution,
   and the stake is gone. The judges still got paid, because they
   are paid to examine, never to pass."
   Explorer: finalize Evs6i5SgYre3a1UoARSf23rCd2ucgqiJjhHry9piLgVh,
   execute 2drmcWxndvDJz13TbG4iy7uGfB8yZGT1YEW7eAqafh1W.

## Close (80-90s)

"The NFT always dies. The only question is whether it dies as a
redemption or as an execution. Binding Vow, on NEAR testnet."
Show: app URL and contract address on screen.

## X post draft (kokoron posts from his own account)

I built Binding Vow for #NEARHackathon: lock your own stake on your
own promise, minted as a soulbound NFT. A swarm of judge agents
fixes your proof terms, then votes on your proof. Keep your word,
burn the NFT, get your stake back. Break it, the NFT burns as an
execution and the stake is gone.

Live demo inside, one kept vow and one executed vow, both verifiable
on chain. @NEARProtocol #NEARHackathon

App: https://binding-vow-ilkokorons-projects.vercel.app
Code: (repo URL after push)

## Submission checklist

- [x] Working prototype on testnet (contract, swarm, frontend live)
- [x] On-chain evidence both directions (vow-5 redeemed, vow-6 executed)
- [x] Public GitHub repo: https://github.com/ILKokoron/binding-vow
- [ ] Demo video recorded from this script
- [ ] X post published by kokoron (needs his account)
- [ ] Submission form: tracks NFTs That Do Something + AI Swarms
      (+ Agent Economy optional), repo URL, demo post URL
- [ ] Empty mainnet NEAR account address for the payout field
      (kokoron creates one; no funds, no deploy)
- [x] Project name: Binding Vow (already branded everywhere;
      kokoron confirms or renames before submit)
- [ ] Deadline: 14 Nov 2026 23:59 UTC (15 Nov 06:59 WIB)

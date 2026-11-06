// One judge agent. Three judge accounts run this same file, but each
// applies a DIFFERENT published rule, so the swarm's diversity is real
// and auditable, not three copies of one opinion:
//
// - judge1, the Literalist: approves only if the proof's SHA-256
//   matches the hash committed in the proof submission.
// - judge2, the Formalist: approves if the proof is reachable and a
//   hash was committed at all; checks the form is complete, not the
//   content.
// - judge3, the Skeptic: approves only if the proof is reachable, at
//   least 512 bytes of substance, AND the hash matches.
//
// Usage: node judge.js <judgeAccount> <tokenId>
// Writes a full evidence report to reports/<tokenId>-<judge>.json and
// votes commit-reveal on chain.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { view, tx } = require('./near');
const { checkProof } = require('./checker');

const RULES = {
  judge1: {
    persona: 'Literalist',
    decide: (vow, chk) => chk.hash_match === true,
    why: 'hash_match must be exactly true',
  },
  judge2: {
    persona: 'Formalist',
    decide: (vow, chk) => chk.reachable && typeof vow.proof_hash === 'string' && vow.proof_hash.length > 0,
    why: 'proof reachable and a proof hash was committed',
  },
  judge3: {
    persona: 'Skeptic',
    decide: (vow, chk) => chk.reachable && chk.bytes >= 512 && chk.hash_match === true,
    why: 'reachable, at least 512 bytes, and hash matches',
  },
};

async function main() {
  const [judge, tokenId] = process.argv.slice(2);
  const key = Object.keys(RULES).find((k) => judge.startsWith(k));
  if (!key) throw new Error(`no rule for judge account ${judge}`);
  const rule = RULES[key];

  const vow = await view('get_vow', { token_id: tokenId });
  if (!vow) throw new Error(`vow ${tokenId} not found`);
  if (vow.status !== 'judging') throw new Error(`vow ${tokenId} is ${vow.status}, not judging`);

  const chk = await checkProof(vow.proof_uri, vow.proof_hash);
  const approve = rule.decide(vow, chk);
  const salt = crypto.randomBytes(8).toString('hex');
  const commitment = crypto
    .createHash('sha256')
    .update(`${approve}:${salt}`)
    .digest('hex');

  const commitTx = await tx(judge, 'commit_vote', { token_id: tokenId, commitment });
  const revealTx = await tx(judge, 'reveal_vote', { token_id: tokenId, approve, salt });

  const report = {
    judge,
    persona: rule.persona,
    rule: rule.why,
    token_id: tokenId,
    task: vow.task,
    proof_terms: vow.proof_terms,
    checker: chk,
    decision: approve ? 'approve' : 'reject',
    salt,
    commitment,
    commit_tx: commitTx,
    reveal_tx: revealTx,
    at: new Date().toISOString(),
  };
  const dir = path.join(__dirname, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${tokenId}-${key}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ judge, persona: rule.persona, decision: report.decision, report: file }));
}

if (require.main === module) {
  main().catch((e) => {
    console.error('JUDGE_ERROR', e.message);
    process.exit(1);
  });
}

module.exports = { RULES };

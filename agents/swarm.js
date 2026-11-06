// Swarm orchestrator: runs the three judge agents as separate
// processes (each with its own account, rule, and report), then
// finalizes the vow on chain and prints the verdict.
//
// Usage: node swarm.js <tokenId> [finalizerAccount]
const { execFileSync } = require('child_process');
const path = require('path');
const { view, tx } = require('./near');

const JUDGES = [
  'judge1.bindingvow1106.testnet',
  'judge2.bindingvow1106.testnet',
  'judge3.bindingvow1106.testnet',
];

async function main() {
  const [tokenId, finalizer = 'bindingvow1106.testnet'] = process.argv.slice(2);
  for (const judge of JUDGES) {
    const out = execFileSync('node', [path.join(__dirname, 'judge.js'), judge, tokenId], {
      encoding: 'utf8',
      timeout: 180000,
    });
    console.log(out.trim());
  }
  const finTx = await tx(finalizer, 'finalize', { token_id: tokenId });
  const vow = await view('get_vow', { token_id: tokenId });
  console.log(
    JSON.stringify({
      token_id: tokenId,
      finalize_tx: finTx,
      status: vow.status,
      reveals: vow.reveals,
      fee_settled: vow.fee_settled,
    })
  );
}

if (require.main === module) {
  main().catch((e) => {
    console.error('SWARM_ERROR', e.message);
    process.exit(1);
  });
}

// Shared NEAR helpers for the Binding Vow swarm.
// Reads go through the public testnet RPC. Signed calls go through the
// official near CLI with the legacy keychain, so private keys never
// enter this code; they stay in ~/.near-credentials where the CLI
// put them.
const { execFile } = require('child_process');
const path = require('path');

const CONTRACT = process.env.BV_CONTRACT || 'bindingvow.bindingvow1106.testnet';
// rpc.testnet.near.org is unreachable from this VM (egress proxy
// timeout); the FastNEAR mirror answers fine and serves the same data.
const RPC = 'https://rpc.testnet.fastnear.com';
const NEAR_BIN = path.join(
  process.env.HOME,
  'tools/near-bin/near-cli-rs-x86_64-unknown-linux-gnu/near'
);

async function view(method, args) {
  const body = {
    jsonrpc: '2.0',
    id: 'bv',
    method: 'query',
    params: {
      request_type: 'call_function',
      account_id: CONTRACT,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      finality: 'final',
    },
  };
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json();
  if (json.error) throw new Error('RPC error: ' + JSON.stringify(json.error));
  const bytes = json.result.result;
  if (!bytes || bytes.length === 0) return null;
  return JSON.parse(Buffer.from(bytes).toString('utf8'));
}

function tx(signer, method, args, deposit = '0 NEAR') {
  return new Promise((resolve, reject) => {
    execFile(
      NEAR_BIN,
      [
        'contract', 'call-function', 'as-transaction', CONTRACT, method,
        'json-args', JSON.stringify(args),
        'prepaid-gas', '100 TeraGas',
        'attached-deposit', deposit,
        'sign-as', signer,
        'network-config', 'testnet', 'sign-with-legacy-keychain', 'send',
      ],
      { timeout: 120000 },
      (err, stdout, stderr) => {
        const out = (stdout || '') + (stderr || '');
        const m = out.match(/Transaction ID: ([A-Za-z0-9]+)/);
        if (err || /panicked|ExecutionError/.test(out)) {
          reject(new Error(`tx ${method} as ${signer} failed: ${out.slice(-400)}`));
        } else {
          resolve(m ? m[1] : null);
        }
      }
    );
  });
}

module.exports = { CONTRACT, view, tx };

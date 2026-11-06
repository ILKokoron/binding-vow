// The Checker: deterministic evidence inspection shared by all judges.
// No opinions here, only measurements: is the proof reachable, how big
// is it, and does its SHA-256 match the hash the user committed in the
// vow's proof submission.
//
// Usage as CLI: node checker.js <proof_uri> [expected_sha256_hex]
// As library: checkProof(uri, expectedHash) -> report object.
const crypto = require('crypto');

async function checkProof(uri, expectedHash) {
  const report = {
    uri,
    reachable: false,
    http_status: null,
    content_type: null,
    bytes: 0,
    sha256: null,
    hash_match: null,
    error: null,
  };
  try {
    const res = await fetch(uri, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    report.http_status = res.status;
    report.content_type = res.headers.get('content-type');
    if (!res.ok) {
      report.error = `HTTP ${res.status}`;
      return report;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    report.reachable = true;
    report.bytes = buf.length;
    report.sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    if (expectedHash) {
      report.hash_match = report.sha256.toLowerCase() === String(expectedHash).toLowerCase();
    }
  } catch (e) {
    report.error = String(e && e.message ? e.message : e);
  }
  return report;
}

if (require.main === module) {
  const [uri, hash] = process.argv.slice(2);
  checkProof(uri, hash).then((r) => console.log(JSON.stringify(r, null, 2)));
}

module.exports = { checkProof };

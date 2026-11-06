// Binding Vow frontend. Reads are plain JSON-RPC. Writes go through
// the visitor's own NEAR wallet (MyNearWallet redirect flow): this
// page never holds a key.
const CONTRACT = 'bindingvow.bindingvow1106.testnet';
const RPC = 'https://rpc.testnet.fastnear.com';
const EXPLORER_TX = 'https://explorer.testnet.near.org/transactions/';

document.getElementById('contractId').textContent = CONTRACT;

// ---------- navigation ----------
document.querySelectorAll('nav button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.screen').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.getElementById('screen-' + b.dataset.screen).classList.add('active');
  });
});

// ---------- chain reads ----------
async function rpcView(method, args) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'bv', method: 'query',
      params: {
        request_type: 'call_function', account_id: CONTRACT, method_name: method,
        args_base64: btoa(unescape(encodeURIComponent(JSON.stringify(args)))), finality: 'final',
      },
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  if (!j.result.result || j.result.result.length === 0) return null;
  return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result)));
}

function fmtNear(yocto) {
  const y = BigInt(yocto);
  const whole = y / 10n ** 24n;
  const frac = (y % 10n ** 24n).toString().padStart(24, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
function fmtTime(ns) {
  return new Date(Number(BigInt(ns) / 1000000n)).toLocaleString();
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ---------- notary (same published rules as agents/notary.js) ----------
const TEMPLATES = [
  { category: 'digital-build', keywords: ['repo', 'github', 'deploy', 'website', 'app', 'code', 'contract', 'program', 'bot', 'api'],
    terms: (t) => `Proof = (1) a public URL that loads successfully (repo, deployed page, or contract account), (2) the SHA-256 hash of the main deliverable file or build artifact, submitted as the proof hash, (3) submitted before the deadline. A screenshot alone is not proof. Task covered: "${t}"` },
  { category: 'content', keywords: ['video', 'youtube', 'post', 'write', 'article', 'essay', 'design', 'draw', 'song', 'record'],
    terms: (t) => `Proof = (1) a public URL to the published work itself (not a draft), (2) the SHA-256 hash of the exported final file, submitted as the proof hash, (3) published before the deadline. Task covered: "${t}"` },
  { category: 'physical', keywords: ['run', 'gym', 'workout', 'weight', 'walk', 'swim', 'bike', 'marathon', 'push-up', 'exercise'],
    terms: (t) => `Proof = (1) a photo or video that contains the random code word issued on the proof day, visible in frame, (2) the SHA-256 hash of that photo or video file, submitted as the proof hash, (3) taken and submitted before the deadline. Old photos without the code word do not count. Task covered: "${t}"` },
  { category: 'learning', keywords: ['learn', 'study', 'course', 'read', 'book', 'exam', 'practice', 'language', 'chapter'],
    terms: (t) => `Proof = (1) a public or shareable artifact produced by the learning (notes page, exercise repo, recorded recitation, graded quiz result), (2) its SHA-256 hash submitted as the proof hash, (3) produced before the deadline. A claim of hours studied is not proof. Task covered: "${t}"` },
];
const VAGUE = ['something', 'stuff', 'more', 'better', 'soon', 'etc', 'misc'];
function notarize(task, stakeNear, durationDays) {
  const warnings = [];
  const text = (task || '').trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length < 3) {
    return { accepted: false, reason: 'Task is too vague to judge: fewer than 3 words. A judge cannot verify this later, so the vow must not seal.', warnings };
  }
  if (VAGUE.some((w) => words.includes(w)) && words.length < 6) {
    warnings.push('Task leans on vague words; the proof terms below pin it to one artifact.');
  }
  const hit = TEMPLATES.find((tpl) => tpl.keywords.some((k) => lower.includes(k)));
  const category = hit ? hit.category : 'general';
  const terms = hit ? hit.terms(text)
    : `Proof = (1) one concrete artifact that exists because the task was done (a link or a file), (2) its SHA-256 hash submitted as the proof hash, (3) submitted before the deadline. If no artifact can exist, this task cannot be judged and must not seal. Task covered: "${text}"`;
  if (typeof stakeNear === 'number' && typeof durationDays === 'number') {
    if (stakeNear < 0.05 && durationDays > 30) warnings.push(`Stake looks light for a ${durationDays}-day vow (${stakeNear} NEAR). The system does not block this, but a stake that does not hurt rarely binds.`);
    if (stakeNear >= 1 && durationDays <= 1) warnings.push('Large stake on a very short vow. Make sure the deadline is realistic before sealing.');
  }
  return { accepted: true, category, proof_terms: terms, warnings };
}

// ---------- make a vow ----------
let notaryResult = null;
const forfeitSelect = document.getElementById('forfeitSelect');
forfeitSelect.addEventListener('change', () => {
  document.getElementById('forfeitCustomWrap').classList.toggle('hidden', forfeitSelect.value !== 'custom');
});
document.getElementById('btnNotary').addEventListener('click', () => {
  const task = document.getElementById('taskInput').value;
  const stake = Number(document.getElementById('stakeInput').value);
  const days = Number(document.getElementById('hoursInput').value) / 24;
  notaryResult = notarize(task, stake, days);
  const out = document.getElementById('notaryOut');
  const seal = document.getElementById('btnSeal');
  out.classList.remove('hidden');
  if (!notaryResult.accepted) {
    out.innerHTML = `<b class="warn">Notary rejected this task.</b><p>${esc(notaryResult.reason)}</p>`;
    seal.classList.add('hidden');
    return;
  }
  out.innerHTML =
    `<b>Notary accepted.</b> Category: ${esc(notaryResult.category)}` +
    `<p><b>Proof terms that will be sealed on chain:</b></p><p>${esc(notaryResult.proof_terms)}</p>` +
    (notaryResult.warnings.length ? `<p class="warn">${notaryResult.warnings.map(esc).join('<br>')}</p>` : '') +
    `<p class="hint">Sealing locks stake + fee. Inside the cancel window you can still take it back in full. Submitting proof seals it for good.</p>`;
  seal.classList.remove('hidden');
});

// ---------- wallet (multi-wallet, see wallet.js) ----------
document.getElementById('btnWallet').addEventListener('click', async () => {
  if (!window.bvWallet) {
    document.getElementById('walletState').textContent = 'Wallet module still loading, try again in a second.';
    return;
  }
  try { await window.bvWallet.open(); }
  catch (e) { document.getElementById('walletState').textContent = e.message; }
});

async function callContract(method, args, depositYocto) {
  if (!window.bvWallet) throw new Error('Wallet module still loading.');
  return window.bvWallet.call(method, args, depositYocto);
}

document.getElementById('btnSeal').addEventListener('click', async () => {
  const msg = document.getElementById('sealMsg');
  try {
    if (!notaryResult || !notaryResult.accepted) throw new Error('Ask the notary first.');
    const stake = nearApi.utils.format.parseNearAmount(document.getElementById('stakeInput').value);
    const fee = nearApi.utils.format.parseNearAmount(document.getElementById('feeInput').value);
    const forfeit = forfeitSelect.value === 'custom'
      ? (document.getElementById('forfeitCustom').value.trim() || null) : null;
    const result = await callContract('create_vow', {
      task: document.getElementById('taskInput').value.trim(),
      proof_terms: notaryResult.proof_terms,
      duration_secs: Number(document.getElementById('hoursInput').value) * 3600,
      judging_window_secs: Number(document.getElementById('judgeWinInput').value) * 60,
      cancel_window_secs: Number(document.getElementById('cancelInput').value) * 60,
      stake, fee, forfeit_to: forfeit,
    }, (BigInt(stake) + BigInt(fee)).toString());
    msg.innerHTML = `Sealed. Transaction: <a href="${EXPLORER_TX}${result.transaction.hash}" target="_blank">${result.transaction.hash}</a>`;
  } catch (e) { msg.textContent = 'Seal failed: ' + e.message; }
});

// ---------- my vows ----------
function vowCard(v) {
  const el = document.createElement('div');
  el.className = 'vow';
  el.innerHTML =
    `<div class="top"><b>${esc(v.token_id)}</b><span class="chip ${esc(v.status)}">${esc(v.status)}</span></div>` +
    `<dl>` +
    `<dt>Task</dt><dd>${esc(v.task)}</dd>` +
    `<dt>Proof terms</dt><dd>${esc(v.proof_terms)}</dd>` +
    `<dt>Stake</dt><dd>${fmtNear(v.stake)} NEAR (fee ${fmtNear(v.fee)} NEAR)</dd>` +
    `<dt>Deadline</dt><dd>${fmtTime(v.deadline_ns)}</dd>` +
    `<dt>Forfeit to</dt><dd>${v.forfeit_to ? esc(v.forfeit_to) : 'burn'}</dd>` +
    (v.proof_uri ? `<dt>Proof</dt><dd><a href="${esc(v.proof_uri)}" target="_blank">${esc(v.proof_uri)}</a><br><code>${esc(v.proof_hash || '')}</code></dd>` : '') +
    (v.reveals && v.reveals.length ? `<dt>Votes</dt><dd>${v.reveals.map((r) => `${esc(r[0].split('.')[0])}: ${r[1] ? 'approve' : 'reject'}`).join(' · ')}</dd>` : '') +
    `</dl>`;
  return el;
}
document.getElementById('btnLoadVows').addEventListener('click', async () => {
  const owner = document.getElementById('ownerInput').value.trim();
  const list = document.getElementById('vowList');
  list.innerHTML = '<p class="hint">Reading from chain...</p>';
  try {
    const tokens = await rpcView('nft_tokens_for_owner', { account_id: owner, from_index: null, limit: null });
    const ids = (tokens || []).map((t) => t.token_id);
    // History includes burned tokens; the known demo range is checked too.
    list.innerHTML = '';
    if (!ids.length) list.innerHTML = '<p class="hint">No live vow NFTs for this account.</p>';
    for (const id of ids) {
      const v = await rpcView('get_vow', { token_id: id });
      if (v) list.appendChild(vowCard(v));
    }
  } catch (e) { list.innerHTML = `<p class="warn">Load failed: ${esc(e.message)}</p>`; }
});

// ---------- proof ----------
let proofHash = null;
document.getElementById('proofFile').addEventListener('change', async (ev) => {
  const f = ev.target.files[0];
  const out = document.getElementById('proofHashOut');
  if (!f) { proofHash = null; out.textContent = 'pick a file'; return; }
  const buf = await f.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  proofHash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  out.textContent = proofHash;
});
document.getElementById('btnSubmitProof').addEventListener('click', async () => {
  const msg = document.getElementById('proofMsg');
  try {
    const tokenId = document.getElementById('proofVowId').value.trim();
    const uri = document.getElementById('proofUri').value.trim();
    if (!tokenId || !uri || !proofHash) throw new Error('Vow ID, proof link, and a hashed file are all required.');
    const result = await callContract('submit_proof', { token_id: tokenId, proof_uri: uri, proof_hash: proofHash }, '0');
    msg.innerHTML = `Proof submitted. Transaction: <a href="${EXPLORER_TX}${result.transaction.hash}" target="_blank">${result.transaction.hash}</a>. The swarm can now judge.`;
  } catch (e) { msg.textContent = 'Submit failed: ' + e.message; }
});

// ---------- verdict ----------
const PERSONA = { judge1: 'Literalist', judge2: 'Formalist', judge3: 'Skeptic' };
document.getElementById('btnLoadVerdict').addEventListener('click', async () => {
  const id = document.getElementById('verdictVowId').value.trim();
  const out = document.getElementById('verdictOut');
  out.innerHTML = '<p class="hint">Reading from chain...</p>';
  try {
    const v = await rpcView('get_vow', { token_id: id });
    if (!v) { out.innerHTML = '<p class="warn">No such vow.</p>'; return; }
    let html = '';
    const card = vowCard(v);
    out.innerHTML = ''; out.appendChild(card);
    if (v.reveals && v.reveals.length) {
      html += '<table class="votes"><tr><th>Judge</th><th>Vote</th></tr>' +
        v.reveals.map((r) => {
          const short = r[0].split('.')[0];
          return `<tr><td>${esc(short)} (${PERSONA[short] || 'judge'})</td><td>${r[1] ? 'approve' : 'reject'}</td></tr>`;
        }).join('') + '</table>';
    } else {
      html += '<p class="hint">No revealed votes yet.</p>';
    }
    if (['vow-3', 'vow-4', 'vow-5', 'vow-6'].includes(id)) {
      html += `<p>Full evidence reports: ${['judge1', 'judge2', 'judge3'].map((j) => `<a href="reports/${id}-${j}.json" target="_blank">${j}</a>`).join(' · ')}</p>`;
    }
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
  } catch (e) { out.innerHTML = `<p class="warn">Load failed: ${esc(e.message)}</p>`; }
});

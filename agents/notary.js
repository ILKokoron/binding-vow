// The Notary: first swarm role, works BEFORE any money locks.
// Takes a raw task in the user's own words and either rejects it as
// too vague to judge, or rewrites it into concrete, checkable proof
// terms. Rule-based on purpose: the notary must be predictable, and
// its rules are public, so a rejection is never a black box.
//
// Usage: node notary.js "<task text>" [stakeNear] [durationDays]
// Prints one JSON object.

const TEMPLATES = [
  {
    category: 'digital-build',
    keywords: ['repo', 'github', 'deploy', 'website', 'app', 'code', 'contract', 'program', 'bot', 'api'],
    terms: (t) =>
      `Proof = (1) a public URL that loads successfully (repo, deployed page, or contract account), (2) the SHA-256 hash of the main deliverable file or build artifact, submitted as the proof hash, (3) submitted before the deadline. A screenshot alone is not proof. Task covered: "${t}"`,
  },
  {
    category: 'content',
    keywords: ['video', 'youtube', 'post', 'write', 'article', 'essay', 'design', 'draw', 'song', 'record'],
    terms: (t) =>
      `Proof = (1) a public URL to the published work itself (not a draft), (2) the SHA-256 hash of the exported final file, submitted as the proof hash, (3) published before the deadline. Task covered: "${t}"`,
  },
  {
    category: 'physical',
    keywords: ['run', 'gym', 'workout', 'weight', 'walk', 'swim', 'bike', 'marathon', 'push-up', 'exercise'],
    terms: (t) =>
      `Proof = (1) a photo or video that contains the random code word issued on the proof day, visible in frame, (2) the SHA-256 hash of that photo or video file, submitted as the proof hash, (3) taken and submitted before the deadline. Old photos without the code word do not count. Task covered: "${t}"`,
  },
  {
    category: 'learning',
    keywords: ['learn', 'study', 'course', 'read', 'book', 'exam', 'practice', 'language', 'chapter'],
    terms: (t) =>
      `Proof = (1) a public or shareable artifact produced by the learning (notes page, exercise repo, recorded recitation, graded quiz result), (2) its SHA-256 hash submitted as the proof hash, (3) produced before the deadline. A claim of hours studied is not proof. Task covered: "${t}"`,
  },
];

const VAGUE_MARKERS = ['something', 'stuff', 'more', 'better', 'soon', 'etc', 'misc'];

function notarize(task, stakeNear, durationDays) {
  const warnings = [];
  const text = (task || '').trim();
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);

  if (words.length < 3) {
    return {
      accepted: false,
      reason: 'Task is too vague to judge: fewer than 3 words. A judge cannot verify this later, so the vow must not seal.',
      warnings,
    };
  }
  if (VAGUE_MARKERS.some((w) => words.includes(w)) && words.length < 6) {
    warnings.push('Task leans on vague words; the proof terms below pin it to one artifact.');
  }

  const hit = TEMPLATES.find((tpl) => tpl.keywords.some((k) => lower.includes(k)));
  const category = hit ? hit.category : 'general';
  const terms = hit
    ? hit.terms(text)
    : `Proof = (1) one concrete artifact that exists because the task was done (a link or a file), (2) its SHA-256 hash submitted as the proof hash, (3) submitted before the deadline. If no artifact can exist, this task cannot be judged and must not seal. Task covered: "${text}"`;

  if (typeof stakeNear === 'number' && typeof durationDays === 'number') {
    if (stakeNear < 0.05 && durationDays > 30) {
      warnings.push(
        `Stake looks light for a ${durationDays}-day vow (${stakeNear} NEAR). The system does not block this, but a stake that does not hurt rarely binds.`
      );
    }
    if (stakeNear >= 1 && durationDays <= 1) {
      warnings.push('Large stake on a very short vow. Make sure the deadline is realistic before sealing.');
    }
  }

  return { accepted: true, category, proof_terms: terms, warnings };
}

if (require.main === module) {
  const [task, stake, days] = process.argv.slice(2);
  const out = notarize(
    task,
    stake !== undefined ? Number(stake) : undefined,
    days !== undefined ? Number(days) : undefined
  );
  console.log(JSON.stringify(out, null, 2));
}

module.exports = { notarize };

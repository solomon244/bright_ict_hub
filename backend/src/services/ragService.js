const knowledge = require('../data/tutorKnowledge.json');

/** English question “filler” words — drop these so “what is html?” scores on `html`, not 1/3. */
const EN_QUESTION_STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'do',
  'does',
  'did',
  'can',
  'could',
  'would',
  'should',
  'may',
  'might',
  'must',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'my',
  'your',
  'this',
  'that',
  'what',
  'which',
  'who',
  'whom',
  'where',
  'when',
  'why',
  'how',
  'please',
  'thanks',
  'thank',
  'hello',
  'hi',
  'hey',
  'in',
  'on',
  'at',
  'to',
  'of',
  'from',
  'with',
  'about',
  'into',
  'by',
]);

function tokenize(text) {
  const lower = String(text).toLowerCase();
  const parts = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return new Set(parts);
}

function filterQueryTokens(rawTokens) {
  const filtered = new Set();
  for (const t of rawTokens) {
    if (!EN_QUESTION_STOPWORDS.has(t)) {
      filtered.add(t);
    }
  }
  return filtered.size > 0 ? filtered : rawTokens;
}

function scoreChunk(queryTokens, chunk) {
  const titleTokens = tokenize(chunk.title || '');
  const contentTokens = tokenize(chunk.content || '');
  const tagTokens = new Set((chunk.tags || []).flatMap((t) => [...tokenize(t), String(t).toLowerCase()]));

  const chunkTokens = new Set([...titleTokens, ...contentTokens, ...tagTokens]);

  let overlap = 0;
  for (const t of queryTokens) {
    if (chunkTokens.has(t)) overlap += 1;
  }

  const denom = Math.max(queryTokens.size, 1);
  let score = overlap / denom;

  const tagBoost = (chunk.tags || []).some((tag) =>
    queryTokens.has(String(tag).toLowerCase())
  )
    ? 0.15
    : 0;

  score = Math.min(1, score * 0.85 + tagBoost);

  return score;
}

/**
 * Returns top chunks and a confidence score in [0, 1].
 */
function retrieveKnowledge(queryText, topK = 3) {
  const rawQueryTokens = tokenize(queryText);
  const queryTokens = filterQueryTokens(rawQueryTokens);
  if (queryTokens.size === 0) {
    return { chunks: [], scores: [], confidence: 0 };
  }

  const scored = knowledge.map((chunk) => ({
    chunk,
    score: scoreChunk(queryTokens, chunk),
  }));

  scored.sort((a, b) => b.score - a.score);

  const top = scored.slice(0, topK).filter((s) => s.score > 0);
  const chunks = top.map((t) => t.chunk);
  const scores = top.map((t) => t.score);

  const confidence = scores.length > 0 ? Math.max(...scores) : 0;

  return { chunks, scores, confidence };
}

module.exports = {
  retrieveKnowledge,
};

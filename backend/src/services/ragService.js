const mongoose = require('mongoose');
const staticKnowledge = require('../data/tutorKnowledge.json');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

/* ------------------------------------------------------------------ text */

const STOPWORDS = new Set([
  // English question filler
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'can',
  'could', 'would', 'should', 'may', 'might', 'must', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my',
  'your', 'this', 'that', 'what', 'which', 'who', 'whom', 'where', 'when', 'why', 'how', 'please', 'thanks',
  'thank', 'hello', 'hi', 'hey', 'in', 'on', 'at', 'to', 'of', 'from', 'with', 'about', 'into', 'by', 'for',
  'explain', 'tell', 'show', 'help', 'use', 'work', 'works',
  // Amharic question filler
  'ምንድን', 'ምንድነው', 'ምንድን', 'ነው', 'ናቸው', 'እንዴት', 'ለምን', 'ምን', 'የት', 'መቼ', 'ማን', 'እባክህ', 'እባክሽ',
  'እባክዎ', 'ንገረኝ', 'አስረዳኝ', 'እና', 'ወይም', 'ደግሞ', 'ላይ', 'ውስጥ', 'ጋር',
]);

/** Equivalent terms across English / Amharic spellings, so "ዝርዝር" can find a chunk about "list". */
const SYNONYM_GROUPS = [
  ['list', 'array', 'ዝርዝር'],
  ['function', 'def', 'ፈንክሽን', 'ተግባር'],
  ['variable', 'አንፃፋ', 'ተለዋዋጭ'],
  ['python', 'ፓይተን', 'ፓይዘን'],
  ['api', 'ኤፒአይ', 'request', 'ሪክዌስት'],
  ['html', 'ኤችቲኤምኤል', 'tag'],
  ['website', 'ድር', 'ገጽ', 'web'],
  ['ai', 'ኤአይ', 'model', 'ሞዴል'],
  ['loop', 'ሉፕ', 'iteration'],
  ['database', 'ዳታቤዝ', 'sql'],
];
const SYNONYMS = new Map();
SYNONYM_GROUPS.forEach((group) => group.forEach((t) => SYNONYMS.set(t, group.filter((g) => g !== t))));

/** Known technical terms and curriculum tags are never stemmed (e.g. loanwords like ፓይተን end in ን). */
const PROTECTED = new Set(SYNONYM_GROUPS.flat());
staticKnowledge.forEach((c) =>
  (c.tags || []).forEach((tag) =>
    String(tag)
      .normalize('NFKC')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .forEach((t) => PROTECTED.add(t))
  )
);

const ETHIOPIC = /[\u1200-\u137F]/;
const AM_SUFFIXES = ['ዎቻችን', 'ዎቻቸው', 'ዎች', 'ዎቹ', 'ኦች', 'ኦቹ', 'ው', 'ን', 'ዋ'];
const AM_PREFIXES = ['የ', 'በ', 'ለ', 'ከ', 'ስለ'];

/** Light, deterministic stemmer applied identically to documents and queries. */
function stem(token) {
  if (PROTECTED.has(token)) return token;
  if (ETHIOPIC.test(token)) {
    let t = token;
    for (const p of AM_PREFIXES) {
      if (t.startsWith(p) && [...t].length - [...p].length >= 2) {
        t = t.slice(p.length);
        break;
      }
    }
    for (const s of AM_SUFFIXES) {
      if (t.endsWith(s) && [...t].length - [...s].length >= 2) {
        t = t.slice(0, -s.length);
        break;
      }
    }
    return t;
  }
  let t = token;
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 5 && t.endsWith('sses')) return t.slice(0, -2);
  if (t.length > 4 && /(ches|shes|xes|zes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) t = t.slice(0, -1);
  if (t.length > 5 && t.endsWith('ing')) t = t.slice(0, -3);
  else if (t.length > 4 && t.endsWith('ed')) t = t.slice(0, -2);
  return t;
}

function rawTokens(text) {
  return String(text || '')
    .normalize('NFKC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Tokens → stems, in order, with stop words removed. */
function analyze(text) {
  return rawTokens(text)
    .filter((t) => !STOPWORDS.has(t))
    .map(stem)
    .filter((t) => t.length > 0);
}

/* ----------------------------------------------------------------- index */

const K1 = 1.2;
const B = 0.75;
const FIELD_WEIGHTS = { title: 3, tags: 4, content: 1 };

function buildDoc(chunk) {
  const tf = new Map();
  let length = 0;
  const add = (tokens, weight, fieldName, set) => {
    tokens.forEach((t) => {
      tf.set(t, (tf.get(t) || 0) + weight);
      length += weight;
      if (fieldName === 'meta') set.add(t);
    });
  };
  const strong = new Set(); // matched in title/tags → counts fully toward confidence
  add(analyze(chunk.title), FIELD_WEIGHTS.title, 'meta', strong);
  add(analyze((chunk.tags || []).join(' ')), FIELD_WEIGHTS.tags, 'meta', strong);
  add(analyze(chunk.content), FIELD_WEIGHTS.content, 'content', strong);
  return { chunk, tf, length: Math.max(length, 1), strong };
}

/** Build a searchable BM25 index over `chunks`. */
function createIndex(chunks) {
  const docs = chunks.map(buildDoc);
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const avgLen = docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1) || 1;
  return { docs, df, avgLen, N: docs.length };
}

const idf = (index, term) => {
  const n = index.df.get(term) || 0; // unseen terms are treated as maximally rare
  return Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
};

/** Query terms with weights: original terms 1.0, synonyms 0.6 (only if the term is not itself in the query). */
function queryTerms(queryText) {
  const raw = rawTokens(queryText).filter((t) => !STOPWORDS.has(t));
  const weights = new Map();
  raw.forEach((t) => weights.set(stem(t), 1));
  raw.forEach((t) => {
    (SYNONYMS.get(t) || []).forEach((syn) => {
      const s = stem(syn);
      if (!weights.has(s)) weights.set(s, 0.6);
    });
  });
  return { weights, core: new Set(raw.map(stem)) };
}

/**
 * Rank chunks. `confidence` ∈ [0,1] is the IDF-weighted share of the question's own terms found in
 * the best chunk (title/tag hits count fully, body-only hits 0.85). Unknown words therefore *lower*
 * confidence, which is what lets the tutor admit "my context is partial".
 */
function search(index, queryText, { topK = 3, allow } = {}) {
  const { weights, core } = queryTerms(queryText);
  if (core.size === 0 || index.N === 0) return { chunks: [], scores: [], confidence: 0 };

  const coreIdfTotal = [...core].reduce((s, t) => s + idf(index, t), 0) || 1;

  const scored = [];
  for (const doc of index.docs) {
    if (allow && !allow(doc.chunk)) continue;
    let bm25 = 0;
    let coverage = 0;
    for (const [term, w] of weights) {
      const tf = doc.tf.get(term);
      if (!tf) continue;
      const termIdf = idf(index, term);
      bm25 += w * termIdf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / index.avgLen)));
      if (core.has(term)) coverage += termIdf * (doc.strong.has(term) ? 1 : 0.85);
    }
    // A question term the chunk only expresses through a synonym (request ↔ ሪክዌስት) still earns partial credit.
    for (const term of core) {
      if (doc.tf.has(term)) continue;
      const hasSynonym = [...(SYNONYMS.get(term) || [])].some((syn) => doc.tf.has(stem(syn)));
      if (hasSynonym) coverage += idf(index, term) * 0.8;
    }
    if (bm25 > 0) scored.push({ chunk: doc.chunk, score: bm25, confidence: Math.min(1, coverage / coreIdfTotal) });
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0) return { chunks: [], scores: [], confidence: 0 };

  const best = scored[0].score;
  const top = scored.filter((s) => s.score >= best * 0.35).slice(0, topK);
  return {
    chunks: top.map((s) => s.chunk),
    scores: top.map((s) => s.score),
    confidence: Math.round(scored[0].confidence * 100) / 100,
  };
}

/* ---------------------------------------------------- built-in curriculum */

let staticIndex;
const getStaticIndex = () => {
  if (!staticIndex) staticIndex = createIndex(staticKnowledge.map((c) => ({ ...c, source: 'curriculum' })));
  return staticIndex;
};

/** Synchronous search over the bundled curriculum only (kept for callers that need no database). */
function retrieveKnowledge(queryText, topK = 3) {
  return search(getStaticIndex(), queryText, { topK });
}

/* ------------------------------------------------------- platform lessons */

const MAX_CHUNK_CHARS = 700;
const INDEX_TTL_MS = 5 * 60 * 1000;
const MAX_LESSONS = 2000;

const stripMarkup = (s) =>
  String(s || '')
    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```\w*/g, ' ')) // keep code, drop fences
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`]+/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

/** Split lesson text into ≤700-char passages on paragraph boundaries (long paragraphs are cut on sentences). */
function chunkText(text) {
  const paragraphs = stripMarkup(text)
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const pieces = [];
  paragraphs.forEach((p) => {
    if (p.length <= MAX_CHUNK_CHARS) {
      pieces.push(p);
      return;
    }
    let cur = '';
    p.split(/(?<=[.!?።])\s+/).forEach((sentence) => {
      if ((cur + ' ' + sentence).length > MAX_CHUNK_CHARS && cur) {
        pieces.push(cur);
        cur = sentence;
      } else {
        cur = cur ? `${cur} ${sentence}` : sentence;
      }
    });
    if (cur) pieces.push(cur);
  });
  const merged = [];
  pieces.forEach((p) => {
    const last = merged[merged.length - 1];
    if (last && (last + ' ' + p).length <= MAX_CHUNK_CHARS) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p.slice(0, MAX_CHUNK_CHARS * 2));
  });
  return merged;
}

function lessonToChunks(lesson, course) {
  const body = [lesson.description, lesson.content].filter(Boolean).join('\n\n');
  const passages = chunkText(body);
  if (passages.length === 0) return [];
  return passages.map((content) => ({
    lessonId: String(lesson._id),
    courseId: String(course._id),
    title: lesson.title,
    tags: [...(course.tags || []), course.title].filter(Boolean),
    content,
    source: 'lesson',
    free: !course.price || course.price === 0,
    previewable: !!lesson.isPreviewable,
  }));
}

let lessonCache = { at: 0, index: null, building: null };

async function buildLessonIndex() {
  const lessons = await Lesson.find({ content: { $exists: true, $ne: '' } })
    .select('title description content isPreviewable course')
    .populate({ path: 'course', select: 'title tags price isPublished', match: { isPublished: true } })
    .limit(MAX_LESSONS)
    .lean();
  const chunks = lessons.filter((l) => l.course).flatMap((l) => lessonToChunks(l, l.course));
  return createIndex(chunks);
}

async function getLessonIndex() {
  if (lessonCache.index && Date.now() - lessonCache.at < INDEX_TTL_MS) return lessonCache.index;
  if (!lessonCache.building) {
    lessonCache.building = buildLessonIndex()
      .then((index) => {
        lessonCache = { at: Date.now(), index, building: null };
        return index;
      })
      .catch((err) => {
        lessonCache.building = null;
        throw err;
      });
  }
  return lessonCache.building;
}

/** Call after lessons or courses change if fresher answers than the 5-minute cache are needed. */
function invalidateLessonIndex() {
  lessonCache = { at: 0, index: null, building: null };
}

/**
 * Retrieve context for a student's question from the bundled curriculum AND the platform's real lessons.
 * A student only gets lesson text from courses they are enrolled in, free courses, or preview lessons,
 * so the tutor can never be used to read paid content they have not unlocked.
 * Falls back to the bundled curriculum if the database is unavailable.
 */
async function retrieveContext(queryText, { studentId, topK = 3 } = {}) {
  const base = search(getStaticIndex(), queryText, { topK });
  if (mongoose.connection.readyState !== 1) return base;

  try {
    const [lessonIndex, enrolled] = await Promise.all([
      getLessonIndex(),
      studentId ? Enrollment.find({ student: studentId, status: { $ne: 'dropped' } }).select('course').lean() : [],
    ]);
    const enrolledSet = new Set(enrolled.map((e) => String(e.course)));
    const fromLessons = search(lessonIndex, queryText, {
      topK,
      allow: (c) => c.free || c.previewable || enrolledSet.has(c.courseId),
    });

    // BM25 scores from two different indexes are not comparable, so rank each candidate by its strength
    // relative to its own source's best hit, weighted by how confident that source is overall.
    const rank = (src) =>
      src.chunks.map((chunk, i) => ({ chunk, score: src.scores[i], key: (src.scores[i] / src.scores[0]) * src.confidence }));
    const merged = [...rank(base), ...rank(fromLessons)].sort((a, b) => b.key - a.key).slice(0, topK);

    return {
      chunks: merged.map((m) => m.chunk),
      scores: merged.map((m) => m.score),
      confidence: Math.max(base.confidence, fromLessons.confidence),
    };
  } catch (err) {
    console.error('RAG lesson retrieval failed, using bundled curriculum only:', err?.message);
    return base;
  }
}

module.exports = {
  retrieveKnowledge,
  retrieveContext,
  invalidateLessonIndex,
  // exported for tests
  createIndex,
  search,
  analyze,
  stem,
  chunkText,
  lessonToChunks,
};

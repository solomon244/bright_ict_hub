/** Tutor orchestration — tuned via env where noted */

const MAX_TUTOR_HISTORY = 12;
const DEFAULT_RAG_PARTIAL_THRESHOLD = 0.65;

function getRagPartialThreshold() {
  const n = Number(process.env.RAG_CONFIDENCE_THRESHOLD);
  if (Number.isFinite(n) && n > 0 && n <= 1) {
    return n;
  }
  return DEFAULT_RAG_PARTIAL_THRESHOLD;
}

/** Student signals confusion / retry — used for repeated-confusion escalation */
const CONFUSION_REGEXES = [
  /አልገባኝም/i,
  /አልተረዳሁም/i,
  /እንደገና/i,
  /repeat/i,
  /again/i,
  /i don'?t understand/i,
  /confus/i,
];

const ESCALATION_MESSAGES = {
  repeatedConfusion:
    'ጥያቄህ ለአስተማሪህ እያስተላለፍኩ ነው — ብዙም ሳይቆይ ምላሽ ያገኛሉ!',
};

module.exports = {
  MAX_TUTOR_HISTORY,
  getRagPartialThreshold,
  CONFUSION_REGEXES,
  ESCALATION_MESSAGES,
};

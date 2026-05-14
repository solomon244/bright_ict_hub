/**
 * Rule-based escalation triggers before LLM (distress, policy, scope).
 */

const DISTRESS_PATTERNS = [
  /የደከምኩ/i,
  /አልችልም/i,
  /አልገኝም/i,
  /suicid/i,
  /kill\s*myself/i,
  /want\s*to\s*die/i,
  /ዋልፌ\s*ይገድለኛል/i,
];

const POLICY_PATTERNS = [
  /exam\s*answer/i,
  /answer\s*key/i,
  /ሙከራ\s*መልስ/i,
  /ደብዳቤ\s*መልስ/i,
  /grade\s*my/i,
  /school\s*policy/i,
];

/** Topics clearly outside Python / web / basic AI — shallow heuristic */
const OUT_OF_SCOPE_PATTERNS = [
  /organic\s*chemistry/i,
  /calculus\s*integration/i,
  /quantum\s*field/i,
];

function checkEscalationTriggers(text) {
  const s = String(text || '');

  for (const re of DISTRESS_PATTERNS) {
    if (re.test(s)) {
      return {
        escalate: true,
        reason: 'distress',
        studentMessage:
          'ይህ ለእኔ በጣም አስፈላጊ ነው። መምህርህን ወይም የትምህርት ቤቱ አማካሪን ማናገር ጥሩ ይሆናል። እንዲሁም ጥያቄህ ለአስተማሪህ እያስተላለፍኩ ነው — ብዙም ሳይቆይ ምላሽ ያገኛሉ!',
      };
    }
  }

  for (const re of POLICY_PATTERNS) {
    if (re.test(s)) {
      return {
        escalate: true,
        reason: 'policy',
        studentMessage:
          'ጥያቄህ ለአስተማሪህ እያስተላለፍኩ ነው — ብዙም ሳይቆይ ምላሽ ያገኛሉ!',
      };
    }
  }

  for (const re of OUT_OF_SCOPE_PATTERNS) {
    if (re.test(s)) {
      return {
        escalate: true,
        reason: 'out_of_scope',
        studentMessage:
          'ይህ ከእኛ የትምህርት ይዘት ውጭ ሊሆን ይችላል። ጥያቄህ ለአስተማሪህ እያስተላለፍኩ ነው — ብዙም ሳይቆይ ምላሽ ያገኛሉ!',
      };
    }
  }

  return { escalate: false };
}

module.exports = {
  checkEscalationTriggers,
};

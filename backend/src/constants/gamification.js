/** Gamification rules. XP is only ever granted for events the SERVER can verify. */
const XP = {
  lesson_complete: 10,
  quiz_pass: 20, // first time a quiz is passed (>= 60%)
  quiz_perfect: 10, // bonus, first time a quiz is answered 100% correctly
  course_complete: 50,
};

const QUIZ_PASS_RATIO = 0.6;
const XP_PER_LEVEL = 100;

// Ethiopia is UTC+3 all year (no daylight saving): "a learning day" follows local midnight.
const TIMEZONE = 'Africa/Addis_Ababa';
const TZ_OFFSET_MINUTES = 180;

const BADGES = [
  { code: 'first_lesson', label: 'First step', emoji: '🎯', description: 'Complete your first lesson' },
  { code: 'five_lessons', label: 'On a roll', emoji: '🔥', description: 'Complete 5 lessons' },
  { code: 'twenty_lessons', label: 'Scholar', emoji: '🏆', description: 'Complete 20 lessons' },
  { code: 'streak_3', label: '3-day streak', emoji: '⚡', description: 'Learn 3 days in a row' },
  { code: 'streak_7', label: 'Week warrior', emoji: '🌟', description: 'Learn 7 days in a row' },
  { code: 'first_quiz_pass', label: 'Quiz passer', emoji: '✅', description: 'Pass a quiz' },
  { code: 'perfect_quiz', label: 'Perfectionist', emoji: '💯', description: 'Score 100% on a quiz' },
  { code: 'course_complete', label: 'Graduate', emoji: '🎓', description: 'Finish a whole course' },
];

module.exports = { XP, QUIZ_PASS_RATIO, XP_PER_LEVEL, TIMEZONE, TZ_OFFSET_MINUTES, BADGES };

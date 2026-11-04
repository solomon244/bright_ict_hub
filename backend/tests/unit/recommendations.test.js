const { buildRecommendations } = require('../../src/services/recommendationService');

const NOW = new Date('2026-11-02T12:00:00Z').getTime();
const DAY = 24 * 60 * 60 * 1000;
const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();

const html = { _id: 'c1', title: 'HTML Basics', level: 'beginner', category: 'web' };
const css = { _id: 'c2', title: 'CSS Layouts', level: 'intermediate', category: 'web' };
const py = { _id: 'c3', title: 'Python Intro', level: 'beginner', category: 'prog' };
const catalog = [html, css, py];
const lessonsByCourse = { c1: [{ _id: 'l2', title: 'Tags', order: 2 }, { _id: 'l1', title: 'Intro', order: 1 }] };

const base = { enrollments: [], lessonsByCourse: {}, progress: [], attempts: [], catalog, now: NOW };

describe('buildRecommendations', () => {
  test('a brand-new learner gets beginner courses and default goals', () => {
    const r = buildRecommendations(base);
    expect(r.source).toBe('rules');
    expect(r.items.every((i) => i.type === 'start_course')).toBe(true);
    expect(r.items.map((i) => i.courseId)).toEqual(expect.arrayContaining(['c1', 'c3']));
    expect(r.items.map((i) => i.courseId)).not.toContain('c2'); // intermediate: not for a first-timer
    expect(r.goals).toEqual({ weeklyLessons: 3, dailyLessons: 1, basedOn: 'default' });
  });

  test('recommends the first unfinished lesson in order', () => {
    const r = buildRecommendations({
      ...base,
      enrollments: [{ course: html, lastAccessedAt: iso(1) }],
      lessonsByCourse,
      progress: [{ lesson: 'l1', course: 'c1', status: 'completed', lastVisitedAt: iso(1) }],
    });
    expect(r.items[0]).toMatchObject({ type: 'continue_lesson', lessonId: 'l2', courseId: 'c1' });
    expect(r.atRisk).toBe(false);
  });

  test('flags weak quiz results (<60%) using only the latest attempt per quiz', () => {
    const r = buildRecommendations({
      ...base,
      enrollments: [{ course: html, lastAccessedAt: iso(1) }],
      lessonsByCourse,
      attempts: [
        { quizId: 'q1', quizTitle: 'Tags quiz', lessonId: 'l2', score: 1, totalQuestions: 5 },
        { quizId: 'q1', quizTitle: 'Tags quiz', lessonId: 'l2', score: 5, totalQuestions: 5 }, // older, ignored
        { quizId: 'q2', quizTitle: 'Intro quiz', lessonId: 'l1', score: 4, totalQuestions: 5 },
      ],
    });
    const revise = r.items.filter((i) => i.type === 'revise_quiz');
    expect(revise).toHaveLength(1);
    expect(revise[0].reason).toMatch(/20%/);
  });

  test('marks a learner at risk after 7+ idle days and leads with a welcome-back item', () => {
    const r = buildRecommendations({
      ...base,
      enrollments: [{ course: html, lastAccessedAt: iso(12) }],
      lessonsByCourse,
      progress: [{ lesson: 'l1', course: 'c1', status: 'in_progress', lastVisitedAt: iso(12) }],
    });
    expect(r.atRisk).toBe(true);
    expect(r.items[0].type).toBe('welcome_back');
  });

  test('goals follow the learner’s own recent pace', () => {
    const done = Array.from({ length: 8 }, (_, i) => ({ lesson: `x${i}`, course: 'c1', status: 'completed', lastVisitedAt: iso(3 + i) }));
    const r = buildRecommendations({ ...base, enrollments: [{ course: html, lastAccessedAt: iso(1) }], lessonsByCourse, progress: done });
    expect(r.goals.basedOn).toBe('recent_pace');
    expect(r.goals.weeklyLessons).toBe(2); // 8 lessons / 4 weeks * 1.2 = 2.4 -> 2
    expect(r.goals.dailyLessons).toBe(1);
  });

  test('after finishing every lesson it suggests the next level in the same category', () => {
    const r = buildRecommendations({
      ...base,
      enrollments: [{ course: html, lastAccessedAt: iso(1) }],
      lessonsByCourse,
      progress: [
        { lesson: 'l1', course: 'c1', status: 'completed', lastVisitedAt: iso(2) },
        { lesson: 'l2', course: 'c1', status: 'completed', lastVisitedAt: iso(1) },
      ],
    });
    expect(r.items[0]).toMatchObject({ type: 'start_course', courseId: 'c2' });
  });
});

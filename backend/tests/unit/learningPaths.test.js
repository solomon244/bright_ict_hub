const { buildPathProgress, validatePathPayload } = require('../../src/services/learningPathService');

const courses = [
  { order: 2, course: { _id: 'css' } },
  { order: 1, course: { _id: 'html' } },
  { order: 3, course: { _id: 'js' } },
];

describe('buildPathProgress', () => {
  test('orders courses and points to the first unfinished one', () => {
    const p = buildPathProgress(courses, { html: { status: 'completed', progressPercentage: 100 }, css: { status: 'active', progressPercentage: 40 } });
    expect(p.courses.map((c) => c.course._id)).toEqual(['html', 'css', 'js']);
    expect(p.courses.map((c) => c.status)).toEqual(['completed', 'in_progress', 'not_enrolled']);
    expect(p.nextCourseId).toBe('css');
    expect(p.completedCourses).toBe(1);
    expect(p.percent).toBe(47); // (100 + 40 + 0) / 3
  });

  test('a finished path has no next course', () => {
    const done = Object.fromEntries(['html', 'css', 'js'].map((id) => [id, { status: 'completed', progressPercentage: 100 }]));
    const p = buildPathProgress(courses, done);
    expect(p).toMatchObject({ nextCourseId: null, percent: 100, completedCourses: 3 });
  });

  test('a learner with no enrolments starts at the first course', () => {
    expect(buildPathProgress(courses, {})).toMatchObject({ nextCourseId: 'html', percent: 0 });
  });
});

describe('validatePathPayload', () => {
  test('numbers courses in the order given', () => {
    const out = validatePathPayload({ title: ' Web ', courseIds: ['a', 'b'], skills: [' HTML '] });
    expect(out.title).toBe('Web');
    expect(out.courses).toEqual([{ course: 'a', order: 1 }, { course: 'b', order: 2 }]);
    expect(out.skills).toEqual(['HTML']);
  });
  test.each([
    ['missing title', { courseIds: ['a'] }],
    ['no courses', { title: 'x', courseIds: [] }],
    ['duplicate courses', { title: 'x', courseIds: ['a', 'a'] }],
    ['bad level', { title: 'x', courseIds: ['a'], level: 'expert' }],
  ])('rejects %s', (_n, body) => {
    expect(() => validatePathPayload(body)).toThrow(expect.objectContaining({ statusCode: 422 }));
  });
});

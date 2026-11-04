jest.mock('../../src/models/XPEvent');
jest.mock('../../src/models/Achievement');
jest.mock('../../src/models/User');

const XPEvent = require('../../src/models/XPEvent');
const Achievement = require('../../src/models/Achievement');
const g = require('../../src/services/gamificationService');

// 2026-11-03 12:00 local (EAT) = 09:00Z
const NOW = Date.parse('2026-11-03T09:00:00Z');

describe('dayKey uses Ethiopian local time (UTC+3)', () => {
  test('21:30Z is already the next day locally', () => {
    expect(g.dayKey('2026-11-02T21:30:00Z')).toBe('2026-11-03');
    expect(g.dayKey('2026-11-02T20:30:00Z')).toBe('2026-11-02');
  });
});

describe('computeStreak', () => {
  test('no activity', () => expect(g.computeStreak([], NOW)).toEqual({ current: 0, longest: 0 }));

  test('consecutive days ending today', () => {
    expect(g.computeStreak(['2026-11-01', '2026-11-02', '2026-11-03'], NOW)).toEqual({ current: 3, longest: 3 });
  });

  test('yesterday still counts (grace until the day is over)', () => {
    expect(g.computeStreak(['2026-11-01', '2026-11-02'], NOW).current).toBe(2);
  });

  test('a missed day resets current but keeps longest', () => {
    expect(g.computeStreak(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'], NOW)).toEqual({ current: 0, longest: 4 });
  });

  test('gaps and duplicate days are handled', () => {
    const r = g.computeStreak(['2026-11-03', '2026-11-03', '2026-11-02', '2026-10-30'], NOW);
    expect(r).toEqual({ current: 2, longest: 2 });
  });
});

describe('levels and badges', () => {
  test('level math', () => {
    expect(g.levelFromXp(0)).toMatchObject({ level: 1, xpIntoLevel: 0 });
    expect(g.levelFromXp(250)).toMatchObject({ level: 3, xpIntoLevel: 50, levelProgressPercent: 50 });
  });

  test('badge rules', () => {
    expect(g.earnedBadgeCodes({})).toEqual([]);
    expect(g.earnedBadgeCodes({ lessons: 5, longestStreak: 3, quizPasses: 1 })).toEqual(
      expect.arrayContaining(['first_lesson', 'five_lessons', 'streak_3', 'first_quiz_pass'])
    );
    expect(g.earnedBadgeCodes({ lessons: 5 })).not.toContain('twenty_lessons');
  });

  test('public names never expose a full surname', () => {
    expect(g.publicName({ firstName: 'Selam', lastName: 'Kebede' })).toBe('Selam K.');
    expect(g.publicName({ firstName: 'Abel' })).toBe('Abel');
  });
});

describe('award / recordEvent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('first award grants XP, a repeat grants nothing (unique index)', async () => {
    XPEvent.create.mockResolvedValueOnce({});
    expect(await g.award({ userId: 'u', type: 'lesson_complete', refId: 'l1' })).toEqual({ awarded: true, xp: 10 });
    XPEvent.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    expect(await g.award({ userId: 'u', type: 'lesson_complete', refId: 'l1' })).toEqual({ awarded: false, xp: 0 });
  });

  test('recordEvent never throws, even if the database does', async () => {
    XPEvent.create.mockRejectedValue(new Error('db down'));
    await expect(g.recordEvent({ userId: 'u', type: 'lesson_complete', refId: 'l1' })).resolves.toEqual({ xpAwarded: 0, newBadges: [] });
  });

  test('a new badge is returned once and persisted', async () => {
    XPEvent.create.mockResolvedValue({});
    XPEvent.aggregate
      .mockResolvedValueOnce([{ _id: 'lesson_complete', count: 1, xp: 10 }]) // by type
      .mockResolvedValueOnce([{ _id: '2026-11-03' }]); // days
    Achievement.find.mockReturnValue({ select: () => ({ lean: async () => [] }) });
    Achievement.create.mockResolvedValue({});
    const out = await g.recordEvent({ userId: 'u', type: 'lesson_complete', refId: 'l1' });
    expect(out.xpAwarded).toBe(10);
    expect(out.newBadges.map((b) => b.code)).toEqual(['first_lesson']);
    expect(Achievement.create).toHaveBeenCalledWith({ user: 'u', code: 'first_lesson' });
  });
});

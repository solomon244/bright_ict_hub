jest.mock('../../src/models/CodingChallenge');
jest.mock('../../src/models/CodingSubmission');

const CodingChallenge = require('../../src/models/CodingChallenge');
const CodingSubmission = require('../../src/models/CodingSubmission');
const svc = require('../../src/services/codingService');

const good = {
  slug: 'sum-of-numbers',
  title: 'Sum',
  description: 'Add them up',
  functionName: 'sum',
  tests: [{ args: [[1, 2]], expected: 3 }],
};

describe('validateChallengePayload', () => {
  test('accepts a valid challenge', () => {
    expect(svc.validateChallengePayload(good)).toMatchObject({ functionName: 'sum', tests: [{ args: [[1, 2]], expected: 3 }] });
  });

  test.each([
    ['function name that is not an identifier', { ...good, functionName: 'sum(); alert(1)' }],
    ['function name with a dash', { ...good, functionName: 'my-fn' }],
    ['slug with spaces', { ...good, slug: 'Bad Slug' }],
    ['no tests', { ...good, tests: [] }],
    ['too many tests', { ...good, tests: Array.from({ length: 21 }, () => ({ args: [], expected: 1 })) }],
    ['test without args array', { ...good, tests: [{ args: 'x', expected: 1 }] }],
    ['test without expected', { ...good, tests: [{ args: [] }] }],
    ['oversized tests', { ...good, tests: [{ args: ['x'.repeat(11000)], expected: 1 }] }],
    ['oversized starter code', { ...good, starterCode: 'x'.repeat(5001) }],
  ])('rejects %s', (_n, body) => {
    expect(() => svc.validateChallengePayload(body)).toThrow(expect.objectContaining({ statusCode: 422 }));
  });
});

describe('submitSolution', () => {
  const user = { id: 's1', _id: 's1' };
  beforeEach(() => {
    jest.clearAllMocks();
    CodingChallenge.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'c1', isPublished: true, tests: [1, 2, 3] }) });
    CodingSubmission.create.mockImplementation(async (d) => ({ _id: 'sub1', createdAt: new Date(), ...d }));
  });

  test('saves the attempt as self-reported, with the server’s own test total', async () => {
    const res = await svc.submitSolution({ challengeId: 'c1', user, code: 'function sum(){}', passedCount: 2 });
    expect(res.data.submission).toMatchObject({ passedCount: 2, totalTests: 3, selfReported: true });
  });

  test('rejects impossible scores and empty or oversized code', async () => {
    await expect(svc.submitSolution({ challengeId: 'c1', user, code: 'x', passedCount: 4 })).rejects.toMatchObject({ statusCode: 422 });
    await expect(svc.submitSolution({ challengeId: 'c1', user, code: 'x', passedCount: -1 })).rejects.toMatchObject({ statusCode: 422 });
    await expect(svc.submitSolution({ challengeId: 'c1', user, code: '  ', passedCount: 1 })).rejects.toMatchObject({ statusCode: 422 });
    await expect(svc.submitSolution({ challengeId: 'c1', user, code: 'x'.repeat(20001), passedCount: 1 })).rejects.toMatchObject({ statusCode: 422 });
    expect(CodingSubmission.create).not.toHaveBeenCalled();
  });

  test('unpublished challenges look like they do not exist', async () => {
    CodingChallenge.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'c1', isPublished: false, tests: [1] }) });
    await expect(svc.submitSolution({ challengeId: 'c1', user, code: 'x', passedCount: 0 })).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('challenge ownership', () => {
  test('an instructor cannot edit someone else’s challenge, but an admin can', async () => {
    CodingChallenge.findById.mockResolvedValue({ createdBy: 'other', save: jest.fn() });
    await expect(svc.updateChallenge('c1', { title: 'New' }, { id: 'i1', role: 'instructor' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(svc.updateChallenge('c1', { title: 'New' }, { id: 'a1', role: 'admin' })).resolves.toMatchObject({ statusCode: 200 });
  });
});

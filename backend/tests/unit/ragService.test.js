jest.mock('../../src/models/Lesson');
jest.mock('../../src/models/Enrollment');

const mongoose = require('mongoose');
const rag = require('../../src/services/ragService');
const Lesson = require('../../src/models/Lesson');
const Enrollment = require('../../src/models/Enrollment');

describe('stemming & analysis', () => {
  test('English plurals and -ing/-ed collapse to one stem', () => {
    expect(rag.stem('lists')).toBe(rag.stem('list'));
    expect(rag.stem('functions')).toBe(rag.stem('function'));
    expect(rag.stem('queries')).toBe('query');
    expect(rag.stem('looping')).toBe('loop');
    expect(rag.stem('class')).toBe('class'); // never strips -ss
  });

  test('Amharic plural/object suffixes and "of" prefix are stripped conservatively', () => {
    expect(rag.stem('ዝርዝሮች')).toBe('ዝርዝሮች'); // not a listed suffix → untouched
    expect(rag.stem('ፈንክሽን')).toBe('ፈንክሽን'); // protected loanword keeps its final ን
    expect(rag.stem('የቡና')).toBe('ቡና');
    expect(rag.stem('ቡናን')).toBe('ቡና');
    expect(rag.stem('የን')).toBe('የን'); // too short to strip
  });

  test('stop words (English and Amharic question filler) are removed', () => {
    expect(rag.analyze('What is HTML?')).toEqual(['html']);
    expect(rag.analyze('ፓይተን ምንድነው')).toEqual(['ፓይተን']);
  });
});

describe('retrieveKnowledge (bundled curriculum)', () => {
  test('finds the right lesson, including for plural / inflected questions', () => {
    expect(rag.retrieveKnowledge('What are python lists?').chunks[0].lessonId).toBe('py-02-lists');
    expect(rag.retrieveKnowledge('how do functions return values').chunks[0].lessonId).toBe('py-03-functions');
    expect(rag.retrieveKnowledge('What is HTML?').chunks[0].lessonId).toBe('web-01-html');
  });

  test('Amharic synonyms reach English-tagged chunks', () => {
    expect(rag.retrieveKnowledge('ዝርዝር').chunks[0].lessonId).toBe('py-02-lists');
  });

  test('confidence is high for an on-topic question and low when most terms are unknown', () => {
    const good = rag.retrieveKnowledge('python list append');
    const offTopic = rag.retrieveKnowledge('how do I deploy kubernetes with terraform');
    const mixed = rag.retrieveKnowledge('python kubernetes terraform docker');
    expect(good.confidence).toBeGreaterThan(0.65);
    expect(offTopic.chunks).toEqual([]);
    expect(offTopic.confidence).toBe(0);
    expect(mixed.confidence).toBeLessThan(0.65); // unknown words lower confidence (old scorer would not)
  });

  test('empty or stop-word-only input returns nothing', () => {
    expect(rag.retrieveKnowledge('').chunks).toEqual([]);
    expect(rag.retrieveKnowledge('what is the').chunks).toEqual([]);
  });

  test('results are ranked and capped at topK', () => {
    const r = rag.retrieveKnowledge('python', 2);
    expect(r.chunks.length).toBeLessThanOrEqual(2);
    expect([...r.scores].sort((a, b) => b - a)).toEqual(r.scores);
  });
});

describe('chunkText', () => {
  test('keeps passages under the size limit and strips markup', () => {
    const long = `<p>${'Variables store values. '.repeat(120)}</p>`;
    const chunks = rag.chunkText(`# Title\n\n${long}`);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => {
      expect(c.length).toBeLessThanOrEqual(1400);
      expect(c).not.toMatch(/<p>|#/);
    });
  });

  test('empty content yields no chunks', () => {
    expect(rag.chunkText('')).toEqual([]);
    expect(rag.chunkText(null)).toEqual([]);
  });
});

describe('retrieveContext (platform lessons)', () => {
  const origState = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');
  const setReady = (n) => Object.defineProperty(mongoose.connection, 'readyState', { value: n, configurable: true });

  const lessonRows = [
    {
      _id: 'L1',
      title: 'Docker basics',
      content: 'A container packages an app. Docker builds images and runs containers.',
      isPreviewable: false,
      course: { _id: 'C-paid', title: 'DevOps', tags: ['devops'], price: 500 },
    },
    {
      _id: 'L2',
      title: 'Docker intro (free)',
      content: 'Docker lets you run containers on your laptop.',
      isPreviewable: false,
      course: { _id: 'C-free', title: 'Intro', tags: [], price: 0 },
    },
  ];

  const mockLessons = () =>
    Lesson.find.mockReturnValue({
      select: () => ({ populate: () => ({ limit: () => ({ lean: async () => lessonRows }) }) }),
    });
  const mockEnrollments = (courseIds) =>
    Enrollment.find.mockReturnValue({ select: () => ({ lean: async () => courseIds.map((c) => ({ course: c })) }) });

  beforeEach(() => {
    jest.clearAllMocks();
    rag.invalidateLessonIndex();
    mockLessons();
  });
  afterAll(() => origState && Object.defineProperty(mongoose.connection, 'readyState', origState));

  test('without a database connection it falls back to the bundled curriculum', async () => {
    setReady(0);
    const r = await rag.retrieveContext('What is HTML?', { studentId: 's1' });
    expect(r.chunks[0].lessonId).toBe('web-01-html');
    expect(Lesson.find).not.toHaveBeenCalled();
  });

  test('students only receive lesson text from free, preview or enrolled courses', async () => {
    setReady(1);
    mockEnrollments([]);
    const notEnrolled = await rag.retrieveContext('docker containers', { studentId: 's1' });
    expect(notEnrolled.chunks.map((c) => c.lessonId)).toEqual(['L2']); // paid course L1 stays hidden

    rag.invalidateLessonIndex();
    mockEnrollments(['C-paid']);
    const enrolled = await rag.retrieveContext('docker containers', { studentId: 's1' });
    expect(enrolled.chunks.map((c) => c.lessonId)).toContain('L1');
    expect(enrolled.chunks.find((c) => c.lessonId === 'L1').courseId).toBe('C-paid');
  });

  test('a database error never breaks the tutor', async () => {
    setReady(1);
    Lesson.find.mockImplementation(() => {
      throw new Error('db down');
    });
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const r = await rag.retrieveContext('What is HTML?', { studentId: 's1' });
    expect(r.chunks[0].lessonId).toBe('web-01-html');
    spy.mockRestore();
  });

  test('the lesson index is cached between questions', async () => {
    setReady(1);
    mockEnrollments([]);
    await rag.retrieveContext('docker', { studentId: 's1' });
    await rag.retrieveContext('containers', { studentId: 's1' });
    expect(Lesson.find).toHaveBeenCalledTimes(1);
  });
});

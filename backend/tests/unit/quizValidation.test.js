const { validateQuestions, validateAnswers, stripAnswerKey } = require('../../src/services/quizValidation');

const goodQuestion = { prompt: 'What does HTML stand for?', options: ['A', 'B', 'C'], correctAnswerIndex: 1 };

describe('validateQuestions', () => {
  test('accepts a valid question list and trims text', () => {
    const [q] = validateQuestions([{ ...goodQuestion, prompt: '  Hi?  ', explanation: ' because ' }]);
    expect(q.prompt).toBe('Hi?');
    expect(q.explanation).toBe('because');
  });

  test.each([
    ['empty list', []],
    ['not an array', 'nope'],
    ['missing prompt', [{ ...goodQuestion, prompt: ' ' }]],
    ['one option', [{ ...goodQuestion, options: ['A'] }]],
    ['correct index out of range', [{ ...goodQuestion, correctAnswerIndex: 3 }]],
    ['correct index not an integer', [{ ...goodQuestion, correctAnswerIndex: '1' }]],
    ['negative correct index', [{ ...goodQuestion, correctAnswerIndex: -1 }]],
    ['non-string option', [{ ...goodQuestion, options: ['A', 5] }]],
  ])('rejects %s', (_name, input) => {
    expect(() => validateQuestions(input)).toThrow(expect.objectContaining({ statusCode: 422 }));
  });
});

describe('validateAnswers', () => {
  test('accepts valid answers', () => {
    expect(validateAnswers([{ questionIndex: 0, selectedOptionIndex: 2 }], 3)).toHaveLength(1);
  });

  test('rejects duplicates, out-of-range questions and too many answers', () => {
    expect(() =>
      validateAnswers([{ questionIndex: 0, selectedOptionIndex: 0 }, { questionIndex: 0, selectedOptionIndex: 1 }], 3)
    ).toThrow(/Duplicate/);
    expect(() => validateAnswers([{ questionIndex: 5, selectedOptionIndex: 0 }], 3)).toThrow();
    expect(() => validateAnswers([], 3)).toThrow();
    expect(() => validateAnswers('x', 3)).toThrow();
    expect(() =>
      validateAnswers(Array.from({ length: 4 }, (_, i) => ({ questionIndex: i % 3, selectedOptionIndex: 0 })), 3)
    ).toThrow();
  });
});

describe('stripAnswerKey', () => {
  test('removes correctAnswerIndex and explanation but keeps the rest', () => {
    const quiz = { title: 'T', questions: [{ ...goodQuestion, explanation: 'secret' }] };
    const safe = stripAnswerKey(quiz);
    expect(safe.title).toBe('T');
    expect(safe.questions[0]).toEqual({ prompt: goodQuestion.prompt, options: goodQuestion.options });
    expect(JSON.stringify(safe)).not.toMatch(/correctAnswerIndex|secret/);
  });
});

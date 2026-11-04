const { toCsv, cell } = require('../../src/utils/csv');
const { fillDaily, percent } = require('../../src/services/analyticsService');

describe('csv', () => {
  test('starts with a BOM and uses CRLF rows', () => {
    const out = toCsv(['a', 'b'], [{ a: 1, b: 'x' }]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
    expect(out).toBe('\uFEFFa,b\r\n1,x\r\n');
  });

  test('quotes commas, quotes and line breaks', () => {
    expect(cell('a,b')).toBe('"a,b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell('line1\nline2')).toBe('"line1\nline2"');
  });

  test('neutralises spreadsheet formula injection in text cells', () => {
    expect(cell('=HYPERLINK("http://evil")')).toMatch(/^"'=/);
    expect(cell('+cmd')).toBe("'+cmd");
    expect(cell('-1+2')).toBe("'-1+2");
    expect(cell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  test('real negative numbers stay numeric, and Amharic text is untouched', () => {
    expect(cell(-5)).toBe('-5');
    expect(cell('ሰላም')).toBe('ሰላም');
    expect(cell(null)).toBe('');
  });
});

describe('analytics helpers', () => {
  test('percent guards against divide-by-zero', () => {
    expect(percent(1, 0)).toBe(0);
    expect(percent(1, 3)).toBe(33);
  });

  test('fillDaily returns one row per local day with zeros for gaps', () => {
    const now = Date.parse('2026-11-03T09:00:00Z');
    const rows = fillDaily(3, { users: { '2026-11-03': 2 }, enrollments: { '2026-11-01': 5 }, lessons: {}, quizzes: { '2026-11-02': { attempts: 4 } } }, now);
    expect(rows.map((r) => r.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
    expect(rows[0]).toEqual({ date: '2026-11-01', new_users: 0, new_enrollments: 5, lessons_completed: 0, quiz_attempts: 0 });
    expect(rows[1].quiz_attempts).toBe(4);
    expect(rows[2].new_users).toBe(2);
  });

  test('a late-evening UTC instant lands on the next Ethiopian day', () => {
    const rows = fillDaily(1, { users: { '2026-11-03': 1 } }, Date.parse('2026-11-02T22:00:00Z'));
    expect(rows[0]).toMatchObject({ date: '2026-11-03', new_users: 1 });
  });
});

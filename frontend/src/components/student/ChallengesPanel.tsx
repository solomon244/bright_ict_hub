import { useCallback, useEffect, useState } from 'react';
import Button from '../common/Button';
import CodeEditor from './CodeEditor';
import {
  fetchAttempts,
  fetchChallenge,
  fetchChallenges,
  saveAttempt,
  type Challenge,
  type ChallengeSummary,
  type SavedAttempt,
} from '../../services/codingService';
import { apiErrorMessage } from '../../services/tutorService';
import { runChallengeInSandbox, type TestReport } from '../../utils/sandboxRunner';

/** JavaScript function challenges. Tests run in the student's browser sandbox; attempts are saved as practice history. */
const ChallengesPanel = () => {
  const [list, setList] = useState<ChallengeSummary[] | null>(null);
  const [active, setActive] = useState<Challenge | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [report, setReport] = useState<TestReport | null>(null);
  const [attempts, setAttempts] = useState<SavedAttempt[]>([]);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    try {
      setList(await fetchChallenges());
    } catch (err) {
      setError(apiErrorMessage(err));
      setList([]);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const open = async (id: string) => {
    try {
      setError(null);
      setReport(null);
      setSaved(false);
      const [challenge, history] = await Promise.all([fetchChallenge(id), fetchAttempts(id)]);
      setActive(challenge);
      setAttempts(history);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const code = active ? drafts[active._id] ?? active.starterCode : '';

  const run = async () => {
    if (!active) return;
    setRunning(true);
    setSaved(false);
    setReport(await runChallengeInSandbox({ code, functionName: active.functionName, tests: active.tests }));
    setRunning(false);
  };

  const passed = report ? report.results.filter((r) => r.passed).length : 0;

  const save = async () => {
    if (!active || !report) return;
    try {
      await saveAttempt(active._id, code, passed);
      setSaved(true);
      setAttempts(await fetchAttempts(active._id));
      void refreshList();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!active) {
    return (
      <div className="space-y-3">
        {error && <p className="text-sm text-danger">{error}</p>}
        {list === null ? (
          <div className="h-24 animate-pulse rounded-xl bg-stone-200/80" />
        ) : list.length === 0 ? (
          <p className="text-sm text-stone-500">No challenges yet. Ask your instructor or admin to add some.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {list.map((c) => (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => void open(c._id)}
                  className="w-full rounded-xl border border-stone-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary/30"
                >
                  <p className="font-semibold text-stone-900">{c.title}</p>
                  {c.titleAm && <p className="text-xs text-stone-400" lang="am">{c.titleAm}</p>}
                  <p className="mt-1 text-xs text-stone-500">
                    {c.difficulty}
                    {c.myBest ? ` · best ${c.myBest.passed}/${c.myBest.total} · ${c.myBest.attempts} attempt${c.myBest.attempts === 1 ? '' : 's'}` : ''}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => setActive(null)} className="text-sm font-semibold text-primary">
        ← All challenges
      </button>
      <div>
        <h2 className="font-display text-xl font-semibold text-stone-900">{active.title}</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-stone-600">{active.description}</p>
      </div>
      <CodeEditor label="Your solution" value={code} onChange={(v) => setDrafts((d) => ({ ...d, [active._id]: v }))} rows={12} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void run()} disabled={running}>
          {running ? 'Running…' : '▶ Run tests'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void save()} disabled={!report || saved}>
          {saved ? '✓ Attempt saved' : 'Save attempt'}
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {report && (
        <div className="space-y-2" aria-live="polite">
          {report.timeout ? (
            <p className="text-sm font-semibold text-danger">Timed out — does your code loop forever?</p>
          ) : report.compileError ? (
            <p className="text-sm font-semibold text-danger">Error: {report.compileError}</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-stone-800">
                {passed}/{active.tests.length} tests passed {passed === active.tests.length ? '🎉' : ''}
              </p>
              <ul className="space-y-1 text-xs">
                {report.results.map((r, i) => (
                  <li key={i} className={r.passed ? 'text-emerald-700' : 'text-red-600'}>
                    {r.passed ? '✓' : '✗'} {active.functionName}({active.tests[i]?.args.map((a) => JSON.stringify(a)).join(', ')})
                    {!r.passed && (
                      <>
                        {' '}
                        expected {JSON.stringify(active.tests[i]?.expected)}, got {r.error ? `error: ${r.error}` : r.actual}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-stone-400">
        Tests run in your browser, so results are saved as practice history and do not earn XP.
      </p>
      {attempts.length > 0 && (
        <details className="text-sm text-stone-600">
          <summary className="cursor-pointer font-semibold">Previous attempts ({attempts.length})</summary>
          <ul className="mt-2 space-y-1">
            {attempts.slice(0, 5).map((a) => (
              <li key={a._id} className="flex items-center justify-between gap-2">
                <span>
                  {new Date(a.createdAt).toLocaleString()} · {a.passedCount}/{a.totalTests}
                </span>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary"
                  onClick={() => setDrafts((d) => ({ ...d, [active._id]: a.code }))}
                >
                  Load code
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default ChallengesPanel;

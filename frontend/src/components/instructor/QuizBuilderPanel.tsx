import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import {
  createQuiz,
  deleteQuiz,
  fetchQuizByLesson,
  generateQuizDraft,
  updateQuiz,
} from '../../services/quizService';
import { apiErrorMessage } from '../../services/tutorService';

type Q = { prompt: string; options: string[]; correctAnswerIndex: number | null; explanation: string };

type Props = { lessonId: string; lessonTitle: string; onClose: () => void };

const blankQuestion = (): Q => ({ prompt: '', options: ['', '', '', ''], correctAnswerIndex: null, explanation: '' });

/** Returns a human-readable problem with the quiz, or null when it can be published. */
export function validateQuiz(title: string, questions: Q[]): string | null {
  if (!title.trim()) return 'Give the quiz a title.';
  if (questions.length === 0) return 'Add at least one question.';
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    const label = `Question ${i + 1}`;
    if (!q.prompt.trim()) return `${label}: write the question.`;
    const filled = q.options.filter((o) => o.trim());
    if (filled.length < 2) return `${label}: provide at least two answer options.`;
    if (filled.length !== q.options.length) return `${label}: fill in or remove empty options.`;
    if (new Set(filled.map((o) => o.trim().toLowerCase())).size !== filled.length) return `${label}: options must be different.`;
    if (q.correctAnswerIndex === null) return `${label}: mark the correct answer.`;
  }
  return null;
}

/**
 * Instructor quiz editor with an optional AI draft. The AI never publishes anything: it only fills the
 * editor, and the instructor must check each question and its correct answer before pressing Publish.
 */
const QuizBuilderPanel = ({ lessonId, lessonTitle, onClose }: Props) => {
  const [loading, setLoading] = useState(true);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [title, setTitle] = useState(`${lessonTitle} — Quiz`);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [fromAi, setFromAi] = useState(false);
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [language, setLanguage] = useState<'en' | 'am'>('en');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchQuizByLesson(lessonId)
      .then((quiz) => {
        if (!alive) return;
        setQuizId(quiz._id || quiz.id || null);
        setTitle(quiz.title);
        setQuestions(
          quiz.questions.map((q) => ({
            prompt: q.prompt,
            options: q.options,
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : null,
            explanation: q.explanation || '',
          })),
        );
      })
      .catch((err) => {
        // 404 just means "no quiz yet"; anything else is worth showing.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (alive && status !== 404) setError(apiErrorMessage(err));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [lessonId]);

  const patch = (i: number, change: Partial<Q>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...change } : q)));

  const generate = async () => {
    if (questions.length > 0 && !window.confirm('Replace the questions in the editor with a new AI draft?')) return;
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const draft = await generateQuizDraft({ lessonId, count, difficulty, language });
      setQuestions(draft.questions.map((q) => ({ ...q, explanation: q.explanation || '' })));
      if (!quizId) setTitle(draft.title);
      setFromAi(true);
      setNotice('AI draft ready. Read every question and confirm the marked answer is correct before publishing.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    const problem = validateQuiz(title, questions);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const payloadQuestions = questions.map((q) => ({
      prompt: q.prompt.trim(),
      options: q.options.map((o) => o.trim()),
      correctAnswerIndex: q.correctAnswerIndex as number,
      explanation: q.explanation.trim() || undefined,
    }));
    try {
      if (quizId) {
        await updateQuiz(quizId, { title: title.trim(), questions: payloadQuestions });
        setNotice('Quiz updated.');
      } else {
        const created = await createQuiz({ lesson: lessonId, title: title.trim(), questions: payloadQuestions });
        setQuizId(created._id || created.id || null);
        setNotice('Quiz published. Enrolled students can now take it.');
      }
      setFromAi(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!quizId || !window.confirm('Delete this quiz? Students’ past attempts will no longer be reachable from it.')) return;
    setSaving(true);
    try {
      await deleteQuiz(quizId);
      setQuizId(null);
      setQuestions([]);
      setNotice('Quiz deleted.');
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none';

  return (
    <Card className="space-y-5 border border-primary/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">{quizId ? 'Edit quiz' : 'Create quiz'}</p>
          <h4 className="font-display text-lg font-semibold text-stone-900">{lessonTitle}</h4>
        </div>
        <Button variant="ghost" onClick={onClose} className="text-sm">
          Close
        </Button>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-stone-200/80" />
      ) : (
        <>
          <div className="space-y-3 rounded-xl bg-primary/5 p-4">
            <p className="text-sm font-semibold text-stone-800">Draft with AI</p>
            <p className="text-xs text-stone-500">
              Questions are generated from this lesson’s text only. Nothing is saved until you press Publish.
            </p>
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="space-y-1">
                <span className="block text-xs text-stone-500">Questions</span>
                <select className={field} value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[3, 5, 8, 10].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-stone-500">Difficulty</span>
                <select className={field} value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="block text-xs text-stone-500">Language</span>
                <select className={field} value={language} onChange={(e) => setLanguage(e.target.value as typeof language)}>
                  <option value="en">English</option>
                  <option value="am">አማርኛ (Amharic)</option>
                </select>
              </label>
              <Button onClick={() => void generate()} disabled={generating || saving}>
                {generating ? 'Generating…' : 'Generate AI draft'}
              </Button>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase text-stone-500">Quiz title</span>
            <input className={field} value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
          </label>

          {fromAi && (
            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs font-semibold text-warning">
              AI-generated draft — not reviewed yet. AI can mark the wrong answer as correct.
            </p>
          )}

          <div className="space-y-4">
            {questions.length === 0 && <p className="text-sm text-stone-500">No questions yet. Generate a draft or add one manually.</p>}
            {questions.map((q, i) => (
              <fieldset key={i} className="space-y-3 rounded-xl border border-stone-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <legend className="text-xs font-semibold uppercase text-stone-500">Question {i + 1}</legend>
                  <button
                    type="button"
                    onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs font-semibold text-danger hover:underline"
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  className={field}
                  rows={2}
                  placeholder="Question"
                  value={q.prompt}
                  onChange={(e) => patch(i, { prompt: e.target.value })}
                />
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${i}`}
                        checked={q.correctAnswerIndex === oi}
                        onChange={() => patch(i, { correctAnswerIndex: oi })}
                        aria-label={`Mark option ${oi + 1} as correct`}
                        className="h-4 w-4 accent-primary"
                      />
                      <input
                        className={field}
                        placeholder={`Option ${oi + 1}`}
                        value={opt}
                        onChange={(e) => patch(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-stone-400">Select the radio button next to the correct answer.</p>
                </div>
                <input
                  className={field}
                  placeholder="Explanation shown after answering (optional)"
                  value={q.explanation}
                  onChange={(e) => patch(i, { explanation: e.target.value })}
                />
              </fieldset>
            ))}
            <Button variant="secondary" onClick={() => setQuestions((prev) => [...prev, blankQuestion()])} disabled={questions.length >= 50}>
              + Add question
            </Button>
          </div>

          {error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{notice}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void publish()} disabled={saving || generating}>
              {saving ? 'Saving…' : quizId ? 'Save changes' : 'Publish quiz'}
            </Button>
            {quizId && (
              <Button variant="ghost" onClick={() => void remove()} disabled={saving} className="text-danger hover:bg-danger/10">
                Delete quiz
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default QuizBuilderPanel;

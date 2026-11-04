import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  createThread,
  fetchBoards,
  fetchThreads,
  type Board,
  type ThreadSummary,
} from '../../services/communityService';
import { apiErrorMessage } from '../../services/tutorService';

const GENERAL = 'general';

const CommunityPage = () => {
  const navigate = useNavigate();
  const [boards, setBoards] = useState<Board[]>([]);
  const [board, setBoard] = useState<string>(GENERAL);
  const [status, setStatus] = useState<'all' | 'open' | 'resolved'>('all');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchBoards().then(setBoards).catch(() => setBoards([]));
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchThreads({
        course: board === GENERAL ? undefined : board,
        status,
        q: submittedQuery || undefined,
      });
      setThreads(data.threads);
    } catch (err) {
      setError(apiErrorMessage(err));
      setThreads([]);
    }
  }, [board, status, submittedQuery]);

  useEffect(() => {
    setThreads(null);
    void load();
  }, [load]);

  const submit = async () => {
    setPosting(true);
    setError(null);
    try {
      const id = await createThread({ title, body, course: board === GENERAL ? undefined : board });
      navigate(`/community/${id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-stone-500" htmlFor="board">Board</label>
          <select
            id="board"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value={GENERAL}>General community · አጠቃላይ</option>
            {boards.map((b) => (
              <option key={b._id} value={b._id}>{b.title}</option>
            ))}
          </select>
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="resolved">Answered</option>
          </select>
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedQuery(query.trim());
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              maxLength={60}
              className="min-w-0 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>
          <Button type="button" size="sm" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New discussion'}
          </Button>
        </div>

        {showForm && (
          <div className="space-y-3 border-t border-stone-100 pt-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title — what is your question?"
              maxLength={140}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Explain what you tried and where you are stuck…"
              rows={5}
              maxLength={5000}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-stone-400">
              Be kind and respectful. Do not share phone numbers, addresses or other personal details. Posts are plain text and can be reported.
            </p>
            <Button type="button" onClick={() => void submit()} disabled={posting || title.trim().length < 3 || body.trim().length < 3}>
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {threads === null ? (
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200/80" />
      ) : threads.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-500">No discussions here yet. Be the first to ask a question!</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {threads.map((t) => (
            <li key={t._id}>
              <Link to={`/community/${t._id}`}>
                <Card className="transition-shadow hover:shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-stone-900">{t.title}</h2>
                    {t.isResolved && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">✓ Answered</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600">{t.preview}</p>
                  <p className="mt-2 text-xs text-stone-400">
                    {t.author.name}
                    {t.author.role && t.author.role !== 'student' ? ` (${t.author.role})` : ''} · {t.commentCount} repl{t.commentCount === 1 ? 'y' : 'ies'} · {new Date(t.lastActivityAt).toLocaleDateString()}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CommunityPage;

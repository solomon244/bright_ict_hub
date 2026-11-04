import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import {
  acceptAnswer,
  fetchThread,
  moderateContent,
  postComment,
  reportContent,
  type ReportReason,
  type ThreadDetail,
} from '../../services/communityService';
import { apiErrorMessage } from '../../services/tutorService';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam' },
  { value: 'wrong_info', label: 'Wrong information' },
  { value: 'other', label: 'Other' },
];

const ThreadPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [reporting, setReporting] = useState<{ kind: 'thread' | 'comment'; id: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await fetchThread(id));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, message?: string, then?: () => void) => {
    try {
      setError(null);
      await fn();
      if (message) setNotice(message);
      if (then) then();
      else await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const sendReply = async () => {
    setSending(true);
    await act(() => postComment(id, reply), undefined, undefined);
    setReply('');
    setSending(false);
  };

  const submitReport = async (reason: ReportReason) => {
    if (!reporting) return;
    const target = reporting;
    setReporting(null);
    await act(async () => setNotice(await reportContent(target.kind, target.id, reason)), undefined, () => undefined);
  };

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Link to="/community" className="text-sm font-semibold text-primary">← Back to community</Link>
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }
  if (!data) return <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-2xl bg-stone-200/80" />;

  const { thread, comments, permissions } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/community" className="text-sm font-semibold text-primary">← Back to community</Link>

      {thread.isHidden && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This post is hidden from other learners pending review.</p>
      )}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>{thread.course ? thread.course.title : 'General community'}</span>
          {thread.isResolved && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">✓ Answered</span>}
        </div>
        <h1 className="font-display text-2xl font-semibold text-stone-900">{thread.title}</h1>
        <p className="whitespace-pre-wrap text-sm text-stone-700">{thread.body}</p>
        <p className="text-xs text-stone-400">
          {thread.author.name}
          {thread.author.role && thread.author.role !== 'student' ? ` (${thread.author.role})` : ''} · {new Date(thread.createdAt).toLocaleString()}
        </p>
        <div className="flex flex-wrap gap-3 text-xs font-semibold">
          {!permissions.isAuthor && (
            <button type="button" className="text-stone-500 hover:text-danger" onClick={() => setReporting({ kind: 'thread', id: thread._id })}>
              Report
            </button>
          )}
          {permissions.canModerate && (
            <button type="button" className="text-stone-500 hover:text-primary" onClick={() => void act(() => moderateContent('thread', thread._id, thread.isHidden ? 'unhide' : 'hide'))}>
              {thread.isHidden ? 'Restore' : 'Hide'}
            </button>
          )}
          {(permissions.canModerate || permissions.isAuthor) && (
            <button
              type="button"
              className="text-stone-500 hover:text-danger"
              onClick={() => {
                if (window.confirm('Delete this discussion and all replies?')) {
                  void act(() => moderateContent('thread', thread._id, 'delete'), undefined, () => navigate('/community'));
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
      </Card>

      {reporting && (
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-stone-800">Why are you reporting this?</p>
          <div className="flex flex-wrap gap-2">
            {REASONS.map((r) => (
              <button key={r.value} type="button" onClick={() => void submitReport(r.value)} className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-primary/40">
                {r.label}
              </button>
            ))}
            <button type="button" onClick={() => setReporting(null)} className="px-3 py-1.5 text-xs font-semibold text-stone-400">Cancel</button>
          </div>
        </Card>
      )}

      <h2 className="font-display text-lg font-semibold text-stone-900">
        {comments.length} repl{comments.length === 1 ? 'y' : 'ies'}
      </h2>

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c._id}>
            <Card className={`space-y-2 ${c.isAccepted ? 'border-emerald-300 bg-emerald-50/40' : ''}`}>
              {c.isAccepted && <p className="text-xs font-semibold text-emerald-700">✓ Accepted answer</p>}
              {c.isHidden && <p className="text-xs font-semibold text-amber-700">Hidden from learners</p>}
              <p className="whitespace-pre-wrap text-sm text-stone-700">{c.body}</p>
              <p className="text-xs text-stone-400">
                {c.author.name}
                {c.author.role && c.author.role !== 'student' ? ` (${c.author.role})` : ''} · {new Date(c.createdAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                {(permissions.isAuthor || permissions.canModerate) && !c.isAccepted && !c.isHidden && (
                  <button type="button" className="text-emerald-700" onClick={() => void act(() => acceptAnswer(thread._id, c._id))}>
                    ✓ Mark as answer
                  </button>
                )}
                {!c.mine && (
                  <button type="button" className="text-stone-500 hover:text-danger" onClick={() => setReporting({ kind: 'comment', id: c._id })}>
                    Report
                  </button>
                )}
                {permissions.canModerate && (
                  <button type="button" className="text-stone-500 hover:text-primary" onClick={() => void act(() => moderateContent('comment', c._id, c.isHidden ? 'unhide' : 'hide'))}>
                    {c.isHidden ? 'Restore' : 'Hide'}
                  </button>
                )}
                {(permissions.canModerate || c.mine) && (
                  <button
                    type="button"
                    className="text-stone-500 hover:text-danger"
                    onClick={() => {
                      if (window.confirm('Delete this reply?')) void act(() => moderateContent('comment', c._id, 'delete'));
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>

      {!thread.isHidden && (
        <Card className="space-y-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a helpful reply…"
            rows={4}
            maxLength={3000}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
          />
          <Button type="button" onClick={() => void sendReply()} disabled={sending || !reply.trim()}>
            {sending ? 'Sending…' : 'Reply'}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ThreadPage;

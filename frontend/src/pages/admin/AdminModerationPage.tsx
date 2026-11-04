import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import {
  fetchAuditLogs,
  fetchModerationQueue,
  type AuditEntry,
  type ModerationItem,
} from '../../services/analyticsService';
import { moderateContent } from '../../services/communityService';
import { apiErrorMessage } from '../../services/tutorService';

const AdminModerationPage = () => {
  const [tab, setTab] = useState<'queue' | 'audit'>('queue');
  const [items, setItems] = useState<ModerationItem[] | null>(null);
  const [logs, setLogs] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(() => {
    fetchModerationQueue().then(setItems).catch((err) => {
      setError(apiErrorMessage(err));
      setItems([]);
    });
  }, []);

  useEffect(() => {
    if (tab === 'queue') loadQueue();
    else fetchAuditLogs().then((d) => setLogs(d.logs)).catch((err) => {
      setError(apiErrorMessage(err));
      setLogs([]);
    });
  }, [tab, loadQueue]);

  const act = async (item: ModerationItem, action: 'hide' | 'unhide' | 'delete') => {
    if (action === 'delete' && !window.confirm('Delete this permanently?')) return;
    try {
      setError(null);
      await moderateContent(item.kind, item.id, action);
      loadQueue();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div role="tablist" className="flex gap-2">
        {([['queue', 'Reports'], ['audit', 'Audit log']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${tab === id ? 'bg-primary text-white' : 'bg-white text-stone-600 shadow-sm hover:bg-stone-50'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {tab === 'queue' &&
        (items === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-stone-200/80" />
        ) : items.length === 0 ? (
          <Card><p className="text-sm text-stone-500">Nothing to review. 🎉</p></Card>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={`${it.kind}-${it.id}`}>
                <Card className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-600">{it.kind}</span>
                    <span className="font-semibold text-red-600">{it.reportCount} report{it.reportCount === 1 ? '' : 's'}</span>
                    {it.isHidden && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">hidden</span>}
                    <span className="text-stone-400">
                      {Object.entries(it.reasons).map(([r, n]) => `${r} ×${n}`).join(', ')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-stone-800">{it.text}</p>
                  <p className="text-xs text-stone-400">by {it.author.name} · {new Date(it.createdAt).toLocaleString()}</p>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    <Link to={`/community/${it.threadId}`} className="text-primary">Open</Link>
                    <button type="button" className="text-stone-600 hover:text-primary" onClick={() => void act(it, it.isHidden ? 'unhide' : 'hide')}>
                      {it.isHidden ? 'Restore (dismiss reports)' : 'Hide'}
                    </button>
                    <button type="button" className="text-stone-600 hover:text-danger" onClick={() => void act(it, 'delete')}>Delete</button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'audit' &&
        (logs === null ? (
          <div className="h-24 animate-pulse rounded-2xl bg-stone-200/80" />
        ) : logs.length === 0 ? (
          <Card><p className="text-sm text-stone-500">No privileged actions recorded yet.</p></Card>
        ) : (
          <Card className="overflow-x-auto !p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase text-stone-400">
                <tr><th className="px-4 py-2">When</th><th className="px-4">Who</th><th className="px-4">Action</th><th className="px-4">Target</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id} className="border-t border-stone-100">
                    <td className="px-4 py-2 whitespace-nowrap text-stone-500">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4">{l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : 'system'} <span className="text-xs text-stone-400">{l.actorRole}</span></td>
                    <td className="px-4 font-mono text-xs">{l.action}</td>
                    <td className="px-4 text-xs text-stone-500">{l.targetType} {l.targetId?.slice(-6)} {l.meta ? JSON.stringify(l.meta) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
    </div>
  );
};

export default AdminModerationPage;

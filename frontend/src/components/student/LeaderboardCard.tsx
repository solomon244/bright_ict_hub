import { useCallback, useEffect, useState } from 'react';
import Card from '../common/Card';
import { fetchLeaderboard, setLeaderboardOptIn, type LeaderboardEntry } from '../../services/gamificationService';

type Props = { optedIn: boolean; onOptInChange: (value: boolean) => void };

/** Weekly XP board. Opt-in only: students appear as "First L." and are hidden by default. */
const LeaderboardCard = ({ optedIn, onOptInChange }: Props) => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  useEffect(load, [load, optedIn]);

  const toggle = async () => {
    setBusy(true);
    try {
      onOptInChange(await setLeaderboardOptIn(!optedIn));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-stone-900">This week’s top learners</h2>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-50"
        >
          {optedIn ? 'Hide me from the board' : 'Show me on the board'}
        </button>
      </div>
      {entries === null ? (
        <div className="h-16 animate-pulse rounded-xl bg-stone-200/80" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-stone-500">
          No one is on the board yet. Join in to compete in a friendly way — only your first name and last initial are shown.
        </p>
      ) : (
        <ol className="divide-y divide-stone-100 text-sm">
          {entries.map((e) => (
            <li key={e.rank} className={`flex items-center justify-between py-2 ${e.isMe ? 'font-semibold text-primary' : 'text-stone-700'}`}>
              <span>
                {e.rank}. {e.name} {e.isMe ? '(you)' : ''}
              </span>
              <span>{e.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
};

export default LeaderboardCard;

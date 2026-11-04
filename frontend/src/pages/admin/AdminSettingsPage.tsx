import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import { fetchAiUsage, type AiUsage } from '../../services/analyticsService';

/**
 * Read-only system status. Platform settings are configured through environment variables on the
 * server (see backend/.env.example); this page used to be a non-functional form with made-up values.
 */
const AdminSettingsPage = () => {
  const [ai, setAi] = useState<AiUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchAiUsage(7).then(setAi).catch(() => setFailed(true));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-stone-900">AI service</h2>
        {failed ? (
          <p className="text-sm text-danger">Could not load the AI status.</p>
        ) : !ai ? (
          <div className="h-12 animate-pulse rounded-xl bg-stone-200/80" />
        ) : (
          <ul className="space-y-1 text-sm text-stone-700">
            <li>Provider: <b>{ai.provider.name}</b></li>
            <li>Status: <b className={ai.provider.configured ? 'text-emerald-700' : 'text-red-600'}>{ai.provider.configured ? 'Configured' : 'Not configured (no API key)'}</b></li>
            <li>Daily limit per student: <b>{ai.provider.dailyLimitPerUser}</b> requests</li>
          </ul>
        )}
      </Card>
      <Card className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-stone-900">Configuration</h2>
        <p className="text-sm text-stone-600">
          Platform settings (database, JWT secrets, email, AI provider and limits, payment providers) are set as environment variables on the server, so
          they are never exposed to the browser. See <code>backend/.env.example</code> and the README for the full list.
        </p>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;

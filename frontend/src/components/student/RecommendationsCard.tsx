import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { fetchRecommendations, type RecommendationsPayload, type RecommendationItem } from '../../services/recommendationService';

const linkFor = (item: RecommendationItem): string | null => {
  if (item.courseId && item.lessonId) return `/courses/${item.courseId}/lessons/${item.lessonId}`;
  if (item.courseId) return `/courses/${item.courseId}`;
  return null;
};

const ICON: Record<RecommendationItem['type'], string> = {
  welcome_back: '👋',
  continue_lesson: '▶️',
  revise_quiz: '🔁',
  start_course: '🚀',
};

/** Next steps and suggested goals, computed on the server from the learner's real progress (no LLM). */
const RecommendationsCard = () => {
  const [data, setData] = useState<RecommendationsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecommendations()
      .then((d) => active && setData(d))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  if (failed) return null; // optional widget: never block the dashboard
  if (!data) return <div className="h-32 animate-pulse rounded-2xl bg-stone-200/80" aria-hidden />;
  if (data.items.length === 0) return null;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-stone-900">Recommended for you · ለአንተ የተመረጠ</h2>
        <p className="text-xs text-stone-500">
          Suggested goal: {data.goals.dailyLessons} lesson/day · {data.goals.weeklyLessons}/week
          {data.goals.basedOn === 'recent_pace' ? ' (based on your recent pace)' : ''}
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {data.items.map((item, i) => {
          const to = linkFor(item);
          const body = (
            <div className="flex gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3 transition-colors hover:border-primary/30">
              <span aria-hidden className="text-xl">{ICON[item.type]}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">{item.title}</p>
                <p className="text-xs text-stone-600">{item.reason}</p>
                <p className="text-xs text-stone-400" lang="am">{item.reasonAm}</p>
              </div>
            </div>
          );
          return <li key={`${item.type}-${i}`}>{to ? <Link to={to}>{body}</Link> : body}</li>;
        })}
      </ul>
    </Card>
  );
};

export default RecommendationsCard;

import type { DashboardStat } from '../../types';
import Card from './Card';
import clsx from 'clsx';

interface StatCardProps {
  stat: DashboardStat;
}

const trendColor = {
  up: 'text-primary',
  down: 'text-danger',
  neutral: 'text-stone-500',
};

const StatCard = ({ stat }: StatCardProps) => (
  <Card className="space-y-4">
    <p className="text-sm font-semibold uppercase tracking-wide text-stone-400">{stat.label}</p>
    <p className="text-3xl font-display font-semibold text-stone-900">{stat.value}</p>
    {stat.change && (
      <p className={clsx('text-sm font-medium', trendColor[stat.trend ?? 'neutral'])}>{stat.change}</p>
    )}
    {stat.helper && <p className="text-sm text-stone-500">{stat.helper}</p>}
  </Card>
);

export default StatCard;


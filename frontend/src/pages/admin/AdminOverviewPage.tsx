import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { fetchDashboardStats } from '../../services/adminService';

const AdminOverviewPage = () => {
  const [stats, setStats] = useState({
    userCount: 0,
    instructorPending: 0,
    courseCount: 0,
    enrollmentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const insights = [
    { label: 'Total users', value: stats.userCount.toString(), helper: 'Registered users' },
    { label: 'Pending instructors', value: stats.instructorPending.toString(), helper: 'Awaiting review' },
    { label: 'Active courses', value: stats.courseCount.toString(), helper: `${stats.enrollmentCount} enrollments` },
  ];

  if (loading) {
    return <div className="text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {insights.map((item) => (
          <Card key={item.label} className="space-y-2">
            <p className="text-xs font-semibold uppercase text-primary">{item.label}</p>
            <p className="text-3xl font-display">{item.value}</p>
            <p className="text-xs text-stone-400">{item.helper}</p>
          </Card>
        ))}
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Reports</p>
          <p className="text-xl font-display">Monthly performance digest</p>
        </div>
        <Button>Download PDF</Button>
      </Card>
    </div>
  );
};

export default AdminOverviewPage;



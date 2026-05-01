import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const InstructorOverviewPage = () => {
  const highlights = [
    { label: 'Active cohorts', value: '3' },
    { label: 'Students this term', value: '184' },
    { label: 'Assignments due', value: '12' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.label} className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase text-primary">{item.label}</p>
            <p className="text-3xl font-display">{item.value}</p>
          </Card>
        ))}
      </div>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Upcoming live session</p>
            <p className="text-2xl font-display">Advanced React Patterns</p>
            <p className="text-sm text-stone-500">Friday • 6:00 PM EAT</p>
          </div>
          <Button>Launch classroom</Button>
        </div>
      </Card>
    </div>
  );
};

export default InstructorOverviewPage;



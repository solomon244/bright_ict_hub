import { useState } from 'react';
import Card from '../../components/common/Card';
import PlaygroundPanel from '../../components/student/PlaygroundPanel';
import ChallengesPanel from '../../components/student/ChallengesPanel';

const StudentPracticePage = () => {
  const [tab, setTab] = useState<'challenges' | 'playground'>('challenges');
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div role="tablist" className="flex gap-2">
        {(
          [
            ['challenges', 'Challenges · ፈተናዎች'],
            ['playground', 'Playground · መጫወቻ'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${
              tab === id ? 'bg-primary text-white' : 'bg-white text-stone-600 shadow-sm hover:bg-stone-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <Card>{tab === 'challenges' ? <ChallengesPanel /> : <PlaygroundPanel />}</Card>
    </div>
  );
};

export default StudentPracticePage;

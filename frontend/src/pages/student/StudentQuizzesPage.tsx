import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { fetchQuizHistory } from '../../services/quizService';
import type { QuizAttempt } from '../../types';

const StudentQuizzesPage = () => {
  const [quizHistory, setQuizHistory] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuizHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchQuizHistory();
        setQuizHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quiz history');
        console.error('Failed to load quiz history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuizHistory();
  }, []);

  if (loading) {
    return <div className="text-center">Loading quiz history...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  if (quizHistory.length === 0) {
    return (
      <div className="text-center space-y-4 py-8">
        <p className="text-stone-500">You haven't taken any quizzes yet.</p>
        <Button asChild>
          <Link to="/courses">Browse courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {quizHistory.map((attempt) => {
        const quiz = typeof attempt.quiz === 'object' ? attempt.quiz : null;
        const scorePercentage = attempt.totalQuestions > 0 
          ? Math.round((attempt.score / attempt.totalQuestions) * 100) 
          : 0;

        return (
          <Card key={attempt._id || attempt.id} className="space-y-3">
            <p className="text-xs font-semibold uppercase text-primary">Quiz Attempt</p>
            <h3 className="text-2xl font-display">{quiz?.title || 'Quiz'}</h3>
            <p className="text-sm text-stone-500">
              Score: {attempt.score}/{attempt.totalQuestions} ({scorePercentage}%)
            </p>
            <p className="text-xs text-stone-400">
              Completed: {new Date(attempt.completedAt || Date.now()).toLocaleDateString()}
            </p>
            <Button asChild>
              <Link to={`/quizzes/${typeof attempt.quiz === 'object' ? (attempt.quiz._id || attempt.quiz.id) : attempt.quiz}`}>View details</Link>
            </Button>
          </Card>
        );
      })}
    </div>
  );
};

export default StudentQuizzesPage;



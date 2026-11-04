import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import useAuth from '../../hooks/useAuth';

const roleRedirectMap = {
  student: '/student',
  instructor: '/instructor',
  admin: '/admin',
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(form);
      navigate(roleRedirectMap[user.role] ?? '/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 md:gap-12">
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase text-primary">Welcome back</p>
        <h1 className="text-3xl font-display font-semibold">Log into your learning studio</h1>
        <p className="text-sm text-stone-500">
          Continue building projects, grading assignments, or managing cohorts, all in one space.
        </p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-stone-600">
            <input type="checkbox" className="rounded border-stone-300 text-primary focus:ring-primary" />
            Remember me
          </label>
          <Link to="/forgot-password" className="font-semibold text-primary">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-stone-500">
          New to Ethio Tech Hub?{' '}
          <Link to="/register" className="font-semibold text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;


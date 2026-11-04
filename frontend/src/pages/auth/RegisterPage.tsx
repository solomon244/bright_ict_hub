import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import useAuth from '../../hooks/useAuth';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'instructor'>('student');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords must match.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role,
      });
      navigate('/verify-email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-primary">Join Ethio Tech Hub</p>
        <h1 className="text-3xl font-display font-semibold">Create your account</h1>
        <div className="flex gap-3">
          {(['student', 'instructor'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold capitalize ${
                role === option ? 'border-primary bg-primary/10 text-primary' : 'border-stone-200 text-stone-500'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <form className="grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <InputField
          label="First name"
          name="firstName"
          placeholder="Abel"
          value={form.firstName}
          onChange={handleChange}
          required
        />
        <InputField
          label="Last name"
          name="lastName"
          placeholder="Teshome"
          value={form.lastName}
          onChange={handleChange}
          required
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          required
        />
        <InputField label="Phone" type="tel" placeholder="+251 9 123 4567" />
        <InputField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          required
        />
        <InputField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={handleChange}
          required
        />
        {error && (
          <p className="md:col-span-2 text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
        <div className="md:col-span-2">
          <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </Button>
        </div>
        <p className="md:col-span-2 text-center text-sm text-stone-500">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default RegisterPage;


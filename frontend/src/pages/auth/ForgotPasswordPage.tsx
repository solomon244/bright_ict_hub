import { useState, type FormEvent, type ChangeEvent } from 'react';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { requestPasswordReset } from '../../services/authService';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setStatus('Check your inbox for the reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase text-primary">Account recovery</p>
        <h1 className="text-3xl font-display font-semibold">Reset your password</h1>
        <p className="text-sm text-stone-500">We will email you a secure link to create a new password.</p>
      </div>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
          required
        />
        {status && <p className="text-sm font-semibold text-primary">{status}</p>}
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send reset email'}
        </Button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;


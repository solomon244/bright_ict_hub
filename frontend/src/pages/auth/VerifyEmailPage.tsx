import { useState, type FormEvent, type ChangeEvent } from 'react';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import { requestEmailVerification, verifyEmail } from '../../services/authService';
import useAuth from '../../hooks/useAuth';

const VerifyEmailPage = () => {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await verifyEmail({ token: code });
      await refreshProfile();
      setStatus('Email verified! You can continue exploring the platform.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setStatus(null);
    setError(null);
    try {
      await requestEmailVerification();
      setStatus('A new verification code has been sent to your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend code');
    }
  };

  return (
    <div className="space-y-6 text-center">
      <p className="text-xs font-semibold uppercase text-primary">Verify your inbox</p>
      <h1 className="text-3xl font-display font-semibold">Confirm your Ethio Tech Hub email</h1>
      <p className="text-sm text-stone-500">
        Enter the 6-digit code we sent to your email. This keeps your account secure.
      </p>
      <form className="mx-auto max-w-md space-y-6" onSubmit={handleSubmit}>
        <InputField
          label="Verification code"
          placeholder="123456"
          maxLength={6}
          value={code}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setCode(event.target.value)}
          required
        />
        {status && <p className="text-sm font-semibold text-primary">{status}</p>}
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <Button type="submit" className="w-full py-3 text-base" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying...' : 'Verify email'}
        </Button>
        <button type="button" onClick={handleResend} className="text-sm font-semibold text-primary">
          Resend code
        </button>
      </form>
    </div>
  );
};

export default VerifyEmailPage;


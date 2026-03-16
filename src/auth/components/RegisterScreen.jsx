import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { Dribbble, Eye, EyeOff, Loader2, Mail } from 'lucide-react';

const Field = ({ label, type = 'text', value, onChange, placeholder, right }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 focus:outline-none rounded-lg px-4 py-3 text-white placeholder-zinc-600 text-sm transition-colors pr-10"
      />
      {right && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  </div>
);

// ── Step 1: Registration form ─────────────────────────────────
const RegisterForm = ({ onRegistered, onSwitchToLogin }) => {
  const { signUp } = useAuth();

  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const validate = () => {
    if (!username.trim()) return 'Username is required.';
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!email.trim()) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    try {
      await signUp({ username: username.trim(), password, email: email.trim() });
      onRegistered(username.trim()); // move to verification step
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/40 rounded-2xl flex items-center justify-center mb-4">
            <Dribbble className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">Create Account</h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest">Join the tournament</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">

          <Field label="Username" value={username} onChange={setUsername} placeholder="your_username" />
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="Min. 8 characters"
            right={
              <button onClick={() => setShowPass(p => !p)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
          <Field
            label="Confirm Password"
            type={showPass ? 'text' : 'password'}
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter password"
          />

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-lg uppercase tracking-tighter text-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
          </button>
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

// ── Step 2: Email verification ────────────────────────────────
const VerifyForm = ({ username, onVerified, onSwitchToLogin }) => {
  const { confirmSignUp, resendCode } = useAuth();

  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resent, setResent]     = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) { setError('Please enter the verification code.'); return; }
    setError('');
    setLoading(true);
    try {
      const complete = await confirmSignUp({ username, code: code.trim() });
      if (complete) onVerified();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await resendCode({ username });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/40 rounded-2xl flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">Check Your Email</h1>
          <p className="text-zinc-500 text-sm mt-1 text-center px-4">
            We sent a verification code to the email you registered with.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">

          <Field
            label="Verification Code"
            value={code}
            onChange={setCode}
            placeholder="123456"
          />

          {error && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {resent && (
            <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              Code resent! Check your inbox.
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-lg uppercase tracking-tighter text-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Email'}
          </button>

          <button onClick={handleResend} className="text-zinc-500 hover:text-zinc-300 text-xs text-center transition-colors">
            Didn't get it? Resend code
          </button>
        </div>

        <p className="text-center text-zinc-600 text-sm mt-6">
          <button onClick={onSwitchToLogin} className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
            Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
};

// ── Orchestrator: form → verify ───────────────────────────────
const RegisterScreen = ({ onSwitchToLogin }) => {
  const { signIn } = useAuth();
  const [step, setStep]           = useState('register'); // 'register' | 'verify'
  const [username, setUsername]   = useState('');

  const handleRegistered = (u) => { setUsername(u); setStep('verify'); };

  // After verification, auto sign-in is not guaranteed in all Cognito flows,
  // so we just send them back to login with a success state.
  const handleVerified = () => onSwitchToLogin(true);

  if (step === 'verify') {
    return <VerifyForm username={username} onVerified={handleVerified} onSwitchToLogin={onSwitchToLogin} />;
  }

  return <RegisterForm onRegistered={handleRegistered} onSwitchToLogin={onSwitchToLogin} />;
};

const friendlyError = (err) => {
  switch (err.name) {
    case 'UsernameExistsException':
      return 'That username is already taken. Please choose another.';
    case 'InvalidPasswordException':
      return 'Password must be at least 8 characters and include numbers and symbols.';
    case 'CodeMismatchException':
      return 'Incorrect verification code. Please try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Please request a new one.';
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
};

export default RegisterScreen;

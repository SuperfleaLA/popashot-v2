import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { Dribbble, Eye, EyeOff, Loader2 } from 'lucide-react';

// ── Reusable input ────────────────────────────────────────────
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

// ── Login Screen ──────────────────────────────────────────────
const LoginScreen = ({ onSwitchToRegister, onSwitchToForgot }) => {
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn({ username: username.trim(), password });
      // AuthProvider updates user state — parent will re-render automatically
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 border border-orange-500/40 rounded-2xl flex items-center justify-center mb-4">
            <Dribbble className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">Hoops Eliminator</h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest">Sign in to play</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">

          <Field
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="your_username"
            onKeyDown={handleKeyDown}
          />

          <Field
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            right={
              <button onClick={() => setShowPass(p => !p)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>

          <button
            onClick={onSwitchToForgot}
            className="text-zinc-500 hover:text-zinc-300 text-xs text-center transition-colors"
          >
            Forgot password?
          </button>
        </div>

        {/* Switch to register */}
        <p className="text-center text-zinc-600 text-sm mt-6">
          No account?{' '}
          <button onClick={onSwitchToRegister} className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
            Create one
          </button>
        </p>

      </div>
    </div>
  );
};

// ── Map Cognito error codes to friendly messages ───────────────
const friendlyError = (err) => {
  switch (err.name) {
    case 'UserNotFoundException':
    case 'NotAuthorizedException':
      return 'Incorrect username or password.';
    case 'UserNotConfirmedException':
      return 'Please verify your email before signing in.';
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
};

export default LoginScreen;

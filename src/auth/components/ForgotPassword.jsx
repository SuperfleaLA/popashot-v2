import React, { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';

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

const ForgotPassword = ({ onSwitchToLogin }) => {
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const [step, setStep]           = useState('request'); // 'request' | 'reset'
  const [username, setUsername]   = useState('');
  const [code, setCode]           = useState('');
  const [newPassword, setNewPass] = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  // Step 1 — request reset code
  const handleRequest = async () => {
    if (!username.trim()) { setError('Please enter your username.'); return; }
    setError(''); setLoading(true);
    try {
      await forgotPassword({ username: username.trim() });
      setStep('reset');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — submit new password
  const handleReset = async () => {
    if (!code.trim()) { setError('Please enter the code from your email.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await confirmForgotPassword({ username, code: code.trim(), newPassword });
      setSuccess(true);
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
            <KeyRound className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight text-white">Reset Password</h1>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest">
            {step === 'request' ? 'Enter your username' : 'Enter your new password'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">

          {success ? (
            <>
              <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-3 text-center">
                Password reset! You can now sign in with your new password.
              </p>
              <button
                onClick={() => onSwitchToLogin()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-black py-3 rounded-lg uppercase tracking-tighter text-lg transition-colors"
              >
                Go to Sign In
              </button>
            </>
          ) : step === 'request' ? (
            <>
              <Field label="Username" value={username} onChange={setUsername} placeholder="your_username" />
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleRequest}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black py-3 rounded-lg uppercase tracking-tighter text-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Code'}
              </button>
            </>
          ) : (
            <>
              <Field label="Verification Code" value={code} onChange={setCode} placeholder="123456" />
              <Field
                label="New Password"
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={setNewPass}
                placeholder="Min. 8 characters"
                right={
                  <button onClick={() => setShowPass(p => !p)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black py-3 rounded-lg uppercase tracking-tighter text-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set New Password'}
              </button>
            </>
          )}
        </div>

        {!success && (
          <p className="text-center text-zinc-600 text-sm mt-6">
            <button onClick={() => onSwitchToLogin()} className="text-orange-400 hover:text-orange-300 font-bold transition-colors">
              Back to sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

const friendlyError = (err) => {
  switch (err.name) {
    case 'UserNotFoundException':
      return 'No account found with that username.';
    case 'CodeMismatchException':
      return 'Incorrect code. Please try again.';
    case 'ExpiredCodeException':
      return 'That code has expired. Please request a new one.';
    case 'InvalidPasswordException':
      return 'Password must be at least 8 characters and include numbers and symbols.';
    case 'TooManyRequestsException':
      return 'Too many attempts. Please wait a moment and try again.';
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
};

export default ForgotPassword;

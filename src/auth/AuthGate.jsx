import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import ForgotPassword from './components/ForgotPassword';
import { Loader2 } from 'lucide-react';

// ── AuthGate ──────────────────────────────────────────────────
// Wrap your entire app with this. It shows auth screens when the
// user is not signed in, and renders children when they are.
//
// Usage in main.jsx:
//   <AuthProvider>
//     <AuthGate>
//       <App />
//     </AuthGate>
//   </AuthProvider>
// ─────────────────────────────────────────────────────────────

const AuthGate = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const [screen, setScreen] = useState('login'); // 'login' | 'register' | 'forgot'
  const [verifiedMessage, setVerifiedMessage] = useState(false);

  // Spinner on initial session check
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Authenticated — render the actual app
  if (isAuthenticated) return children;

  // Not authenticated — show auth screens
  if (screen === 'register') {
    return (
      <RegisterScreen
        onSwitchToLogin={(verified) => {
          if (verified) setVerifiedMessage(true);
          setScreen('login');
        }}
      />
    );
  }

  if (screen === 'forgot') {
    return (
      <ForgotPassword
        onSwitchToLogin={() => setScreen('login')}
      />
    );
  }

  return (
    <LoginScreen
      verifiedMessage={verifiedMessage}
      onSwitchToRegister={() => { setVerifiedMessage(false); setScreen('register'); }}
      onSwitchToForgot={() => { setVerifiedMessage(false); setScreen('forgot'); }}
    />
  );
};

export default AuthGate;

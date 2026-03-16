import React, { createContext, useContext, useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import {
  signIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  fetchUserAttributes,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';
import amplifyConfig from './amplifyConfig';

// ── Bootstrap Amplify once ────────────────────────────────────
Amplify.configure(amplifyConfig);

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

// ── Provider ──────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);         // { username, userId, email }
  const [loading, setLoading] = useState(true);   // true while checking session on mount

  // ── Restore session on page load ─────────────────────────
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const cognitoUser = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      setUser({
        username: cognitoUser.username,
        userId: attrs.sub,           // permanent unique ID — never changes
        email: attrs.email,
        displayName: attrs.preferred_username || cognitoUser.username,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Sign In (username or email + password) ────────────────
  const handleSignIn = async ({ username, password }) => {
    const { isSignedIn } = await signIn({ username, password });
    if (isSignedIn) await checkSession();
    return isSignedIn;
  };

  // ── Sign Up ───────────────────────────────────────────────
  const handleSignUp = async ({ username, password, email }) => {
    const { nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
          preferred_username: username,
        },
      },
    });
    // nextStep.signUpStep will be 'CONFIRM_SIGN_UP' — caller shows verify screen
    return nextStep;
  };

  // ── Confirm Sign Up (email verification code) ─────────────
  const handleConfirmSignUp = async ({ username, code }) => {
    const { isSignUpComplete } = await confirmSignUp({
      username,
      confirmationCode: code,
    });
    return isSignUpComplete;
  };

  // ── Resend verification code ──────────────────────────────
  const handleResendCode = async ({ username }) => {
    await resendSignUpCode({ username });
  };

  // ── Sign Out ──────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  // ── Forgot Password — step 1: request code ────────────────
  const handleForgotPassword = async ({ username }) => {
    const { nextStep } = await resetPassword({ username });
    return nextStep;
  };

  // ── Forgot Password — step 2: submit new password ─────────
  const handleConfirmForgotPassword = async ({ username, code, newPassword }) => {
    await confirmResetPassword({ username, confirmationCode: code, newPassword });
  };

  const value = {
    user,                                         // null when signed out
    loading,                                      // true only on initial mount
    isAuthenticated: !!user,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    resendCode: handleResendCode,
    signOut: handleSignOut,
    forgotPassword: handleForgotPassword,
    confirmForgotPassword: handleConfirmForgotPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

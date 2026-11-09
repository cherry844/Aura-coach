import React, { useState } from 'react';
import { 
  auth, 
  reauthenticateWithCredential, 
  updatePassword, 
  EmailAuthProvider, 
  sendPasswordResetEmail, 
  linkWithCredential 
} from '../lib/firebase';
import { Lock, Key, ShieldCheck, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles, Mail } from 'lucide-react';

export function PasswordSettings() {
  const currentUser = auth.currentUser;
  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com');
  const isPasswordUser = currentUser?.providerData.some(p => p.providerId === 'password');

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Link password form state (for Google users)
  const [linkPassword, setLinkPassword] = useState('');
  const [confirmLinkPassword, setConfirmLinkPassword] = useState('');
  const [showLinkPassword, setShowLinkPassword] = useState(false);
  const [isLinkingOpen, setIsLinkingOpen] = useState(false);

  // Status state
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Handle password change for email/password users
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!currentUser || !currentUser.email) {
      setErrorMessage('User session not found. Please log in again.');
      return;
    }

    if (!currentPassword) {
      setErrorMessage('Please enter your current password to verify your identity.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from your current password.');
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Reauthenticate the current user
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Step 2: Update the password securely
      await updatePassword(currentUser, newPassword);

      setSuccessMessage('Your password has been securely updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        setErrorMessage('Current password is incorrect. Please verify and try again.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 8 characters with letters, numbers, or symbols.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setErrorMessage('For security, please log out and log back in before changing your password.');
      } else {
        setErrorMessage(err?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle linking email/password for Google authenticated users
  const handleLinkPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!currentUser || !currentUser.email) {
      setErrorMessage('Account email not found.');
      return;
    }

    if (linkPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (linkPassword !== confirmLinkPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, linkPassword);
      await linkWithCredential(currentUser, credential);
      setSuccessMessage('Email & Password successfully linked! You can now sign in using either Google or your Aura password.');
      setLinkPassword('');
      setConfirmLinkPassword('');
      setIsLinkingOpen(false);
    } catch (err: any) {
      console.error('Link password error:', err);
      if (err?.code === 'auth/credential-already-in-use') {
        setErrorMessage('This email is already linked to another credential.');
      } else if (err?.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 8 characters.');
      } else {
        setErrorMessage(err?.message || 'Failed to link password credential.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Forgot Password email
  const handleSendResetEmail = async () => {
    if (!currentUser?.email) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      setResetEmailSent(true);
      setSuccessMessage(`Password reset link sent to ${currentUser.email}. Check your inbox!`);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setErrorMessage(err?.message || 'Could not send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Success</p>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-800">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Case 1: Google Account without Email/Password */}
      {isGoogleUser && !isPasswordUser && (
        <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-900">Google Authentication Active</h4>
              <p className="text-xs text-zinc-600 leading-relaxed">
                You are signed in via Google (<strong>{currentUser?.email}</strong>). Your credentials and account authentication are securely handled by Google.
              </p>
            </div>
          </div>

          {!isLinkingOpen ? (
            <div className="pt-2 border-t border-indigo-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                Want to also sign in directly using an email and password?
              </p>
              <button
                type="button"
                onClick={() => setIsLinkingOpen(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 self-start cursor-pointer"
              >
                <Key size={14} /> Link Aura Password
              </button>
            </div>
          ) : (
            <form onSubmit={handleLinkPassword} className="pt-4 border-t border-indigo-100/60 space-y-4">
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-zinc-800 uppercase">Set an Aura Account Password</h5>
                <p className="text-xs text-zinc-500">Create a password so you can log in with your email or Google.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">New Password</label>
                  <div className="relative">
                    <input
                      type={showLinkPassword ? 'text' : 'password'}
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 pl-3 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLinkPassword(!showLinkPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showLinkPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmLinkPassword}
                    onChange={(e) => setConfirmLinkPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-white border border-zinc-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsLinkingOpen(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {isLoading ? 'Linking...' : 'Save & Link Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Case 2: Email/Password Account (or Linked Google+Password) */}
      {isPasswordUser && (
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">Change Account Password</h4>
              <p className="text-xs text-zinc-500">Update your Aura login password securely.</p>
            </div>
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={isLoading || resetEmailSent}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Mail size={12} /> {resetEmailSent ? 'Reset Link Sent' : 'Forgot Password?'}
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-4 pr-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-4 pr-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-400 uppercase">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
            >
              <Lock size={14} />
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

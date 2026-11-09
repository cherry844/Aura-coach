import React, { useState } from 'react';
import { Sparkles, Brain, Globe, BookOpen, Mail, Lock, User as UserIcon, ArrowRight, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

export function Login() {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google login failed:', error);
      setErrorMsg(error?.message || 'Google sign-in was interrupted or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (authMode === 'signup') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && userCred.user) {
          await updateProfile(userCred.user, { displayName: name });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error('Email authentication error:', err);
      let userFriendlyMsg = err?.message || 'Authentication failed. Please check your credentials.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        userFriendlyMsg = 'Invalid email or password. Please verify and try again.';
      } else if (err?.code === 'auth/email-already-in-use') {
        userFriendlyMsg = 'An account with this email already exists. Try signing in instead.';
      } else if (err?.code === 'auth/weak-password') {
        userFriendlyMsg = 'Password is too weak. Please use at least 8 characters with numbers or symbols.';
      } else if (err?.code === 'auth/invalid-email') {
        userFriendlyMsg = 'Please enter a valid email address.';
      }
      setErrorMsg(userFriendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setForgotError('Please enter your account email address.');
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err?.code === 'auth/user-not-found') {
        setForgotError('No registered account was found with that email address.');
      } else if (err?.code === 'auth/invalid-email') {
        setForgotError('Please enter a valid email address.');
      } else {
        setForgotError(err?.message || 'Failed to send password reset email.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4 sm:p-6 lg:p-12">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Form & Brand */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Sparkles size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Aura</h1>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Global Skill & Life Platform</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-display font-bold leading-tight text-zinc-900">
              Empower your future with <span className="text-indigo-600">mastery</span>.
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Connect with mentors, learn bite-sized micro-skills, and get 24/7 AI-guided coaching.
            </p>
          </div>

          {/* Social Auth: Continue with Google */}
          <div className="space-y-4">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full px-6 py-3.5 bg-white border border-zinc-200 text-zinc-800 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-5 h-5" />
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-zinc-200 w-full"></div>
              <span className="bg-[#FDFCFB] px-4 text-xs uppercase font-bold text-zinc-400 absolute">or with email</span>
            </div>

            {/* Email/Password Auth Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4 bg-white p-6 rounded-3xl border border-zinc-100 shadow-xl shadow-zinc-100/60">
              {/* Tab Selector: Sign In vs Sign Up */}
              <div className="flex bg-zinc-100 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setErrorMsg(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'signin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signup'); setErrorMsg(null); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {authMode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Your Name</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required={authMode === 'signup'}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 uppercase">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase">Password</label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setForgotSuccess(false);
                        setForgotError(null);
                        setShowForgotModal(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'signup' ? 'Min 8 characters' : 'Enter your password'}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-md active:scale-[0.99] disabled:opacity-60 cursor-pointer text-sm"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : authMode === 'signup' ? (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <span>Sign In to Aura</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-zinc-400">
              By continuing, you agree to Aura's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>

        {/* Right Column: Visual Feature Grid */}
        <div className="lg:col-span-6 hidden lg:block space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-8">
              <div className="p-6 bg-white rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100 space-y-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Brain size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">AI Personal Coach</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">24/7 personalized guidance, habit building, and problem-solving powered by Gemini.</p>
              </div>
              <div className="p-6 bg-white rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100 space-y-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Globe size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">Peer Skill Exchange</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Trade knowledge in real time. Teach Python, learn Italian, practice public speaking.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-white rounded-3xl shadow-xl shadow-zinc-100 border border-zinc-100 space-y-3">
                <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-bold text-zinc-900">Actionable Micro-Lessons</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">Bite-sized 5-minute practical guides written by community mentors with AI cover art.</p>
              </div>
              <div className="p-6 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl shadow-xl shadow-indigo-200 text-white space-y-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-bold">Gamified XP Progression</h3>
                <p className="text-xs text-indigo-100 leading-relaxed">Earn points, unlock achievement badges, and climb the Global Aura Leaderboard.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 z-10 border border-zinc-100"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <h3 className="text-xl font-display font-bold text-zinc-900">Reset Your Password</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Enter the email associated with your Aura account and we'll send you a secure link to create a new password.
                </p>
              </div>

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-emerald-900">Password Reset Email Sent</p>
                      <p className="text-xs text-emerald-700">
                        Check your inbox at <strong>{forgotEmail}</strong> and follow the instructions to securely reset your password.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-full py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-colors"
                  >
                    Done & Return to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Account Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="flex-1 py-3 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100 disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

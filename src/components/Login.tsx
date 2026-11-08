import { Sparkles, Brain, Globe, BookOpen } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import { motion } from 'motion/react';

export function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Sparkles size={32} />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Aura</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-5xl font-display font-bold leading-tight">
              Unlock your potential through <span className="text-indigo-600">collaborative</span> learning.
            </h2>
            <p className="text-xl text-zinc-500 leading-relaxed">
              Join a global community of experts and learners. Exchange skills, solve problems with AI, and grow together.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleLogin}
              className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200 active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/layout/google.svg" alt="Google" className="w-6 h-6" />
              Continue with Google
            </button>
            <p className="text-sm text-zinc-400">By continuing, you agree to Aura's Terms of Service and Privacy Policy.</p>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-2 gap-4">
          <div className="space-y-4 mt-12">
            <div className="p-6 bg-white rounded-3xl shadow-xl border border-zinc-100 space-y-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Brain size={20} />
              </div>
              <h3 className="font-bold">AI Coaching</h3>
              <p className="text-sm text-zinc-500">24/7 personalized guidance for any goal or hurdle.</p>
            </div>
            <div className="p-6 bg-white rounded-3xl shadow-xl border border-zinc-100 space-y-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <Globe size={20} />
              </div>
              <h3 className="font-bold">Skill Exchange</h3>
              <p className="text-sm text-zinc-500">Connect with peers to trade knowledge and build real connections.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-6 bg-white rounded-3xl shadow-xl border border-zinc-100 space-y-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                <BookOpen size={20} />
              </div>
              <h3 className="font-bold">Micro-Lessons</h3>
              <p className="text-sm text-zinc-500">Bite-sized learning modules created by the community.</p>
            </div>
            <div className="p-6 bg-indigo-600 rounded-3xl shadow-xl border border-indigo-500 text-white space-y-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold">Progress Tracking</h3>
              <p className="text-sm text-indigo-100">Save your journey, earn points, and unlock achievements.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

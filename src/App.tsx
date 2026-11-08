import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Globe, 
  Trophy, 
  MessageSquare, 
  Plus, 
  Search, 
  Zap, 
  User as UserIcon,
  ChevronRight,
  BookOpen,
  Send,
  Sparkles,
  Settings,
  Mail,
  Edit3,
  Undo,
  Redo,
  Bell,
  Shield,
  Lock,
  CreditCard,
  Trash2,
  AlertTriangle,
  Users,
  CheckCircle,
  Star,
  Info,
  LogOut
} from 'lucide-react';
import { api } from './api';
import { User, Lesson, ChatMessage } from './types';
import { getCoachResponse } from './services/geminiService';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, onAuthStateChanged, signOut, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Login } from './components/Login';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aura';

function UserAvatar({ src, name, className, iconSize = 20 }: { src?: string, name?: string, className?: string, iconSize?: number }) {
  const avatarUrl = src || (name ? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}` : DEFAULT_AVATAR);
  
  return (
    <div className={cn("bg-zinc-100 flex items-center justify-center overflow-hidden", className)}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={name || "User"} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback to icon if image fails to load
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              const icon = document.createElement('div');
              icon.className = "text-zinc-400";
              parent.appendChild(icon);
            }
          }}
        />
      ) : (
        <UserIcon size={iconSize} className="text-zinc-400" />
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'coach' | 'exchange' | 'lessons' | 'leaderboard' | 'profile' | 'settings' | 'about'>('coach');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('aura_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  });
  const [undoStack, setUndoStack] = useState<ChatMessage[][]>([]);
  const [redoStack, setRedoStack] = useState<ChatMessage[][]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClearChatConfirm, setShowClearChatConfirm] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_notification_settings');
      return saved ? JSON.parse(saved) : {
        exchangeRequests: true,
        lessonCompletions: true,
        feedbackReceived: true,
        weeklySummaries: true,
        pushAlerts: false,
        marketing: true
      };
    } catch (error) {
      return {
        exchangeRequests: true,
        lessonCompletions: true,
        feedbackReceived: true,
        weeklySummaries: true,
        pushAlerts: false,
        marketing: true
      };
    }
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [matches, setMatches] = useState<User[]>([]);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState('');
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isLessonCreateModalOpen, setIsLessonCreateModalOpen] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [feedbackTarget, setFeedbackTarget] = useState<{ matchId: string, toUserId: string, toUserName: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth and data initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await api.getUser(firebaseUser.uid);
          
          if (userData) {
            setUser(userData);
            loadData(firebaseUser.uid);
          } else {
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Learner',
              email: firebaseUser.email || '',
              points: 0,
              skills_offered: '',
              skills_needed: '',
              exchange_methods: 'Chat',
              avatar_url: firebaseUser.photoURL || '',
              completed_lessons_count: 0,
              completed_matches_count: 0
            };
            await api.saveUser(newUser);
            setUser(newUser);
            loadData(firebaseUser.uid);
          }
        } catch (error) {
          console.error("Error during auth state change:", error);
          // Provide fallback user so user can continue to use the app
          const fallbackUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Learner',
            email: firebaseUser.email || '',
            points: 0,
            skills_offered: '',
            skills_needed: '',
            exchange_methods: 'Chat',
            avatar_url: firebaseUser.photoURL || '',
            completed_lessons_count: 0,
            completed_matches_count: 0
          };
          setUser(fallbackUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('aura_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('aura_notification_settings', JSON.stringify(notificationSettings));
  }, [notificationSettings]);

  const loadData = async (userId: string) => {
    try {
      const [l, m, am, lb, fb] = await Promise.allSettled([
        api.getLessons(),
        api.getMatches(userId),
        api.getActiveMatches(userId),
        api.getUsers(),
        api.getFeedback(userId)
      ]);

      if (l.status === 'fulfilled') setLessons(l.value);
      if (m.status === 'fulfilled') setMatches(m.value);
      if (am.status === 'fulfilled') setActiveMatches(am.value);
      if (lb.status === 'fulfilled') setLeaderboard(lb.value);
      
      const feedbackData = fb.status === 'fulfilled' ? fb.value : [];

      // Sync current user with latest data from leaderboard (includes achievements and points)
      if (lb.status === 'fulfilled') {
        const currentUserData = lb.value.find(u => u.id === userId);
        if (currentUserData) {
          setUser({ ...currentUserData, feedback: feedbackData });
        }
      }
    } catch (error) {
      console.error("Critical error in loadData:", error);
    }
  };

  const validateProfileField = (name: string, value: string) => {
    let error = '';
    if (name === 'name') {
      if (!value.trim()) error = 'Name is required';
      else if (value.trim().length < 2) error = 'Name must be at least 2 characters';
    } else if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value.trim()) error = 'Email is required';
      else if (!emailRegex.test(value)) error = 'Invalid email format';
    } else if (name === 'skills_offered' || name === 'skills_needed') {
      if (!value.trim()) error = 'Skills are required (comma separated)';
    }
    setProfileErrors(prev => ({ ...prev, [name]: error }));
    return error === '';
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, chatHistory]);
    setUndoStack(prev => prev.slice(0, -1));
    setChatHistory(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, chatHistory]);
    setRedoStack(prev => prev.slice(0, -1));
    setChatHistory(next);
  };

  const handleClearHistory = () => {
    setUndoStack(prev => [...prev, chatHistory]);
    setRedoStack([]);
    setChatHistory([]);
    setShowClearChatConfirm(false);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Save current state to undo stack before adding new messages
    setUndoStack(prev => [...prev, chatHistory]);
    setRedoStack([]);

    const userMsg: ChatMessage = { role: 'user', text: input };
    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = chatHistory.concat(userMsg).map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      const response = await getCoachResponse(history);
      setChatHistory(prev => [...prev, { role: 'model', text: response || "I'm here to help." }]);
    } catch (error: any) {
      console.error(error);
      setChatHistory(prev => [...prev, {
        role: 'model',
        text: error?.message?.includes('GEMINI_API_KEY')
          ? "Please configure your Gemini API key in **Settings > Secrets** to enable AI coaching."
          : "I ran into a temporary issue thinking through that question. Please try asking again in a moment!"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Loading Aura...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-zinc-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight">Aura</h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <NavButton active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<Brain size={18} />} label="AI Coach" />
            <NavButton active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<Globe size={18} />} label="Exchange" />
            <NavButton active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} icon={<BookOpen size={18} />} label="Micro-Lessons" />
            <NavButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={18} />} label="Leaderboard" />
            <NavButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info size={18} />} label="About" />
            <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Settings" />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-zinc-500">{user?.points} pts</p>
            </div>
            <button 
              onClick={() => setActiveTab('profile')}
              className={cn(
                "w-10 h-10 rounded-full border flex items-center justify-center overflow-hidden transition-all",
                activeTab === 'profile' ? "border-indigo-600 ring-2 ring-indigo-500/20" : "bg-zinc-100 border-zinc-200 text-zinc-400 hover:border-zinc-300"
              )}
            >
              <UserAvatar 
                src={user?.avatar_url} 
                name={user?.name} 
                className="w-full h-full" 
                iconSize={20}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'coach' && (
            <motion.div 
              key="coach"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] flex flex-col gap-4"
            >
              <div className="flex-1 glass rounded-3xl overflow-hidden flex flex-col shadow-xl border-zinc-200">
                <div className="p-3 md:p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Brain size={18} />
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-sm">Aura AI Coach</h2>
                    <p className="text-xs text-zinc-500">Always active • Personalized for {user?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleUndo}
                      disabled={undoStack.length === 0 || isTyping}
                      className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                      title="Undo"
                    >
                      <Undo size={16} />
                    </button>
                    <button 
                      onClick={handleRedo}
                      disabled={redoStack.length === 0 || isTyping}
                      className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                      title="Redo"
                    >
                      <Redo size={16} />
                    </button>
                    <div className="w-px h-4 bg-zinc-200 mx-1" />
                    <button 
                      onClick={() => setShowClearChatConfirm(true)}
                      disabled={chatHistory.length === 0 || isTyping}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400"
                      title="Clear History"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 p-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
                        <MessageSquare size={32} className="hidden md:block" />
                        <MessageSquare size={24} className="md:hidden" />
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-bold">What's on your mind today?</h3>
                      <p className="text-zinc-500 text-xs md:text-sm">Whether it's a career hurdle, a personal goal, or a complex problem, I'm here to help you solve it.</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-4">
                        <SuggestionCard text="How can I improve my focus?" onClick={() => setInput("How can I improve my focus?")} />
                        <SuggestionCard text="Creative ways to learn design" onClick={() => setInput("What are some creative ways to learn design?")} />
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex w-full gap-3", 
                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      <div className="shrink-0 self-end mb-1">
                        {msg.role === 'user' ? (
                          <UserAvatar src={user?.avatar_url} name={user?.name} className="w-7 h-7 md:w-9 md:h-9 rounded-xl shadow-sm" iconSize={16} />
                        ) : (
                          <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <Brain size={16} />
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "flex flex-col gap-1 w-full",
                        msg.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "max-w-[85%] md:max-w-[75%] p-3.5 md:p-4 rounded-2xl text-sm leading-relaxed transition-all",
                          msg.role === 'user' 
                            ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-100" 
                            : "bg-white border border-zinc-100 text-zinc-800 rounded-bl-none shadow-sm hover:shadow-md hover:border-zinc-200"
                        )}>
                          <div className={cn("markdown-body", msg.role === 'user' && "user-markdown-body")}>
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        </div>
                        <span className="text-[10px] text-zinc-400 px-1">
                          {msg.role === 'user' ? 'Sent' : 'Aura AI'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex w-full gap-3 flex-row">
                      <div className="shrink-0 self-end mb-1">
                        <div className="w-7 h-7 md:w-9 md:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                          <Brain size={16} />
                        </div>
                      </div>
                      <div className="bg-white border border-zinc-100 p-3 md:p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center h-10 md:h-12">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.8s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.1s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 md:p-4 bg-white border-t border-zinc-100">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask Aura anything..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-3 md:py-4 pl-4 md:pl-6 pr-12 md:pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isTyping}
                      className="absolute right-1.5 md:right-2 p-2.5 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-100 active:scale-95"
                    >
                      <Send size={18} className="hidden md:block" />
                      <Send size={16} className="md:hidden" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'exchange' && (
            <motion.div 
              key="exchange"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-display font-bold">Global Skill Exchange</h2>
                  <p className="text-zinc-500">Instantly match with people who have the skills you need.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="Search skills..."
                      value={exchangeSearchQuery}
                      onChange={(e) => setExchangeSearchQuery(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setIsOfferModalOpen(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={16} /> Offer Skill
                  </button>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    {exchangeSearchQuery ? `Search Results for "${exchangeSearchQuery}"` : 'Recommended Matches'}
                  </h3>
                  {(() => {
                    const filteredUsers = exchangeSearchQuery 
                      ? leaderboard.filter(u => 
                          u.id !== user?.id && 
                          u.skills_offered.toLowerCase().includes(exchangeSearchQuery.toLowerCase())
                        )
                      : matches;

                    return filteredUsers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredUsers.map(match => (
                          <MatchCard key={match.id} user={match} currentUser={user} onComplete={() => user && loadData(user.id)} />
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 glass rounded-3xl text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                          <Globe size={32} />
                        </div>
                        <p className="text-zinc-500">
                          {exchangeSearchQuery ? "No users found with those skills." : "No instant matches found. Try updating your skills!"}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Your Stats</h3>
                  <div className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Completed Exchanges</span>
                      <span className="text-sm font-bold">{user?.completed_matches_count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Active Exchanges</span>
                      <span className="text-sm font-bold">{activeMatches.length}</span>
                    </div>
                  </div>

                  {activeMatches.length > 0 && (
                    <>
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 mt-8">Active Exchanges</h3>
                      <div className="space-y-3">
                        {activeMatches.map(match => {
                          const isUserA = match.user_a === user?.id;
                          const otherUser = {
                            id: isUserA ? match.user_b : match.user_a,
                            name: isUserA ? match.user_b_name : match.user_a_name,
                            avatar_url: isUserA ? match.user_b_avatar : match.user_a_avatar
                          };
                          return (
                            <div key={match.id} className="glass rounded-2xl p-4 space-y-3 border-indigo-100">
                              <div className="flex items-center gap-3">
                                <UserAvatar 
                                  src={otherUser.avatar_url} 
                                  name={otherUser.name} 
                                  className="w-8 h-8 rounded-full" 
                                  iconSize={16}
                                />
                                <div>
                                  <p className="text-xs font-bold">{otherUser.name}</p>
                                  <p className="text-[10px] text-zinc-500">Learning {match.skill}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setFeedbackTarget({
                                    matchId: match.id,
                                    toUserId: otherUser.id,
                                    toUserName: otherUser.name
                                  });
                                }}
                                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all"
                              >
                                Complete & Feedback
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'lessons' && (
            <motion.div 
              key="lessons"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-display font-bold">Micro-Lessons</h2>
                  <p className="text-zinc-500">Fast, actionable learning in 5–10 minutes.</p>
                </div>
                <button 
                  onClick={() => setIsLessonCreateModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} /> Create Lesson
                </button>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.length > 0 ? (
                  lessons.map(lesson => (
                    <LessonCard key={lesson.id} lesson={lesson} currentUser={user} onComplete={() => user && loadData(user.id)} />
                  ))
                ) : (
                  // Demo lessons
                  <>
                    <LessonCard 
                      lesson={{
                        id: '1',
                        title: 'Mastering the 2-Minute Rule',
                        skill_tag: 'Productivity',
                        duration_mins: 5,
                        content: '',
                        author_id: 'aura',
                        created_at: ''
                      }} 
                      currentUser={user} 
                      onComplete={() => user && loadData(user.id)} 
                    />
                    <LessonCard 
                      lesson={{
                        id: '2',
                        title: 'Basic Sourdough Maintenance',
                        skill_tag: 'Cooking',
                        duration_mins: 8,
                        content: '',
                        author_id: 'chef-mario',
                        created_at: ''
                      }} 
                      currentUser={user} 
                      onComplete={() => user && loadData(user.id)} 
                    />
                    <LessonCard 
                      lesson={{
                        id: '3',
                        title: 'Intro to UI Grid Systems',
                        skill_tag: 'Design',
                        duration_mins: 10,
                        content: '',
                        author_id: 'design-pro',
                        created_at: ''
                      }} 
                      currentUser={user} 
                      onComplete={() => user && loadData(user.id)} 
                    />
                  </>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-display font-bold">Global Leaderboard</h2>
                <p className="text-zinc-500">Top contributors and learners this week.</p>
              </div>

              <div className="glass rounded-3xl overflow-hidden shadow-xl border-zinc-200">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Rank</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">User</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Skills</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-zinc-400 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {leaderboard.map((u, i) => (
                      <tr key={u.id} className={cn("hover:bg-zinc-50/50 transition-colors", u.id === user?.id && "bg-indigo-50/30")}>
                        <td className="px-6 py-4">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                            i === 0 ? "bg-yellow-100 text-yellow-700" : 
                            i === 1 ? "bg-zinc-200 text-zinc-700" :
                            i === 2 ? "bg-orange-100 text-orange-700" : "text-zinc-400"
                          )}>
                            {i + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar 
                              src={u.avatar_url} 
                              name={u.name} 
                              className="w-8 h-8 rounded-full" 
                              iconSize={14}
                            />
                            <span className="font-medium">{u.name}</span>
                            {u.achievements && u.achievements.length > 0 && (
                              <div className="flex gap-0.5">
                                {u.achievements.slice(0, 3).map(a => (
                                  <span key={a.id} title={a.name} className="text-[10px] grayscale hover:grayscale-0 transition-all cursor-help">
                                    {a.icon}
                                  </span>
                                ))}
                                {u.achievements.length > 3 && (
                                  <span className="text-[8px] text-zinc-400 font-bold">+{u.achievements.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-500 truncate max-w-[200px] block">{u.skills_offered}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-600">
                          {u.points.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-12 py-8"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold">
                  <Sparkles size={16} /> Welcome to Aura
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight">The Future of <span className="text-indigo-600 italic">Collaborative Learning</span></h2>
                <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto">Aura is a peer-to-peer skill exchange platform powered by AI, designed to make learning accessible, social, and rewarding.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass rounded-3xl p-8 space-y-4 border-indigo-100">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Star size={24} />
                  </div>
                  <h3 className="text-2xl font-display font-bold">Our Mission</h3>
                  <p className="text-zinc-600 leading-relaxed">
                    We believe that everyone has something to teach and something to learn. Our mission is to break down the barriers to education by connecting curious minds directly, fostering a global community of lifelong learners who grow through mutual exchange.
                  </p>
                </div>
                <div className="glass rounded-3xl p-8 space-y-4 border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                    <Zap size={24} />
                  </div>
                  <h3 className="text-2xl font-display font-bold">How It Works</h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Aura combines advanced AI guidance with authentic human connection. Whether you're looking for a quick micro-lesson or a deep-dive skill exchange, we provide the tools to help you master new abilities at your own pace.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="text-center text-sm font-bold uppercase tracking-widest text-zinc-400">Core Features</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: <Brain />, title: "AI Coaching", desc: "Personalized learning paths and 24/7 support from Aura AI." },
                    { icon: <Globe />, title: "Skill Exchange", desc: "Trade your expertise for the skills you've always wanted to learn." },
                    { icon: <BookOpen />, title: "Micro-Lessons", desc: "Bite-sized knowledge chunks perfect for busy schedules." },
                    { icon: <Trophy />, title: "Gamification", desc: "Earn points, unlock achievements, and climb the ranks." }
                  ].map((feature, i) => (
                    <div key={i} className="p-6 bg-white border border-zinc-100 rounded-2xl space-y-3 hover:shadow-md transition-shadow">
                      <div className="text-indigo-600">{feature.icon}</div>
                      <h4 className="font-bold text-zinc-900">{feature.title}</h4>
                      <p className="text-xs text-zinc-500 leading-relaxed">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-3xl p-12 text-center space-y-6 bg-indigo-600 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
                
                <h3 className="text-3xl font-display font-bold relative z-10">Ready to start your journey?</h3>
                <p className="text-indigo-100 relative z-10 max-w-lg mx-auto">Join thousands of learners today and discover the power of collaborative growth.</p>
                <div className="flex justify-center gap-4 relative z-10">
                  <button 
                    onClick={() => setActiveTab('coach')}
                    className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-xl"
                  >
                    Chat with Aura
                  </button>
                  <button 
                    onClick={() => setActiveTab('exchange')}
                    className="px-8 py-4 bg-indigo-500 text-white border border-indigo-400 rounded-2xl font-bold hover:bg-indigo-400 transition-colors"
                  >
                    Find a Peer
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-8">
                {/* Profile Sidebar */}
                <div className="w-full md:w-1/3 space-y-6">
                  <div className="glass rounded-3xl p-8 text-center space-y-4">
                    <UserAvatar 
                      src={user?.avatar_url} 
                      name={user?.name} 
                      className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-lg" 
                      iconSize={48}
                    />
                    <div>
                      <h2 className="text-2xl font-display font-bold">{user?.name}</h2>
                      <p className="text-zinc-500 text-sm">{user?.email}</p>
                    </div>
                    <div className="pt-4 border-t border-zinc-100 flex justify-around">
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 uppercase font-bold">Points</p>
                        <p className="text-xl font-display font-bold text-indigo-600">{user?.points}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-zinc-400 uppercase font-bold">Rank</p>
                        <p className="text-xl font-display font-bold text-zinc-800">#1.2k</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Achievements</h3>
                    <div className="space-y-3">
                      {user?.achievements && user.achievements.length > 0 ? (
                        user.achievements.map(achievement => (
                          <AchievementBadge 
                            key={achievement.id} 
                            icon={achievement.icon} 
                            label={achievement.name} 
                            description={achievement.description}
                          />
                        ))
                      ) : (
                        <div className="text-center py-4 space-y-2">
                          <Trophy size={24} className="mx-auto text-zinc-200" />
                          <p className="text-xs text-zinc-400">No achievements yet. Start learning to unlock badges!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Main Content */}
                <div className="flex-1 space-y-6">
                  <div className="glass rounded-3xl p-8 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <Settings size={20} className="text-zinc-400" /> Profile Settings
                      </h3>
                    </div>

                    <form className="space-y-6" onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      
                      // Final validation check
                      const name = formData.get('name') as string;
                      const email = formData.get('email') as string;
                      const skillsOffered = formData.get('skills_offered') as string;
                      const skillsNeeded = formData.get('skills_needed') as string;

                      const isNameValid = validateProfileField('name', name);
                      const isEmailValid = validateProfileField('email', email);
                      const isSkillsOfferedValid = validateProfileField('skills_offered', skillsOffered);
                      const isSkillsNeededValid = validateProfileField('skills_needed', skillsNeeded);

                      if (!isNameValid || !isEmailValid || !isSkillsOfferedValid || !isSkillsNeededValid) {
                        return;
                      }

                      if (user) {
                        const updatedUser = {
                          ...user,
                          name,
                          email,
                          avatar_url: formData.get('avatar_url') as string,
                          skills_offered: skillsOffered,
                          skills_needed: skillsNeeded,
                          exchange_methods: Array.from(formData.getAll('methods')).join(', ')
                        };
                        await api.saveUser(updatedUser);
                        setUser(updatedUser);
                        loadData(user.id);
                        alert('Profile updated successfully!');
                      }
                    }}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Full Name</label>
                          <div className="relative">
                            <UserIcon size={16} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", profileErrors.name ? "text-red-400" : "text-zinc-400")} />
                            <input 
                              name="name"
                              type="text" 
                              defaultValue={user?.name}
                              onChange={(e) => validateProfileField('name', e.target.value)}
                              className={cn(
                                "w-full bg-zinc-50 border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 transition-all",
                                profileErrors.name 
                                  ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                                  : "border-zinc-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                              )}
                            />
                          </div>
                          {profileErrors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{profileErrors.name}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Email Address</label>
                          <div className="relative">
                            <Mail size={16} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", profileErrors.email ? "text-red-400" : "text-zinc-400")} />
                            <input 
                              name="email"
                              type="email" 
                              defaultValue={user?.email}
                              onChange={(e) => validateProfileField('email', e.target.value)}
                              className={cn(
                                "w-full bg-zinc-50 border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 transition-all",
                                profileErrors.email 
                                  ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                                  : "border-zinc-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                              )}
                            />
                          </div>
                          {profileErrors.email && <p className="text-[10px] font-bold text-red-500 mt-1">{profileErrors.email}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Avatar URL</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input 
                              name="avatar_url"
                              type="text" 
                              defaultValue={user?.avatar_url}
                              placeholder="https://example.com/avatar.jpg"
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                        <div className="space-y-1 opacity-50 cursor-not-allowed">
                          <label className="text-xs font-bold text-zinc-400 uppercase">User ID (Read-only)</label>
                          <div className="relative">
                            <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <input 
                              type="text" 
                              value={user?.id}
                              readOnly
                              className="w-full bg-zinc-100 border border-zinc-200 rounded-xl py-3 pl-12 pr-4 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Skills You Offer</label>
                        <div className="relative">
                          <Edit3 size={16} className={cn("absolute left-4 top-4 transition-colors", profileErrors.skills_offered ? "text-red-400" : "text-zinc-400")} />
                          <textarea 
                            name="skills_offered"
                            defaultValue={user?.skills_offered}
                            onChange={(e) => validateProfileField('skills_offered', e.target.value)}
                            rows={2}
                            className={cn(
                              "w-full bg-zinc-50 border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 transition-all resize-none",
                              profileErrors.skills_offered 
                                ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                                : "border-zinc-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                            )}
                          />
                        </div>
                        {profileErrors.skills_offered && <p className="text-[10px] font-bold text-red-500 mt-1">{profileErrors.skills_offered}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Skills You Need</label>
                        <div className="relative">
                          <Search size={16} className={cn("absolute left-4 top-4 transition-colors", profileErrors.skills_needed ? "text-red-400" : "text-zinc-400")} />
                          <textarea 
                            name="skills_needed"
                            defaultValue={user?.skills_needed}
                            onChange={(e) => validateProfileField('skills_needed', e.target.value)}
                            rows={2}
                            className={cn(
                              "w-full bg-zinc-50 border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 transition-all resize-none",
                              profileErrors.skills_needed 
                                ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                                : "border-zinc-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                            )}
                          />
                        </div>
                        {profileErrors.skills_needed && <p className="text-[10px] font-bold text-red-500 mt-1">{profileErrors.skills_needed}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Preferred Exchange Methods</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {['Video Call', 'Chat', 'In-person', 'Email', 'Screen Share', 'Voice Call'].map(method => (
                            <label key={method} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
                              <input 
                                type="checkbox" 
                                name="methods" 
                                value={method} 
                                defaultChecked={user?.exchange_methods.includes(method)}
                                className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-zinc-700">{method}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit"
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98]"
                        >
                          Save Profile Changes
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Feedback Received Section */}
                  <div className="glass rounded-3xl p-8 space-y-6">
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                      <MessageSquare size={20} className="text-zinc-400" /> Feedback Received
                    </h3>
                    <div className="space-y-4">
                      {user?.feedback && user.feedback.length > 0 ? (
                        user.feedback.map(fb => (
                          <div key={fb.id} className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <UserAvatar 
                                  src={fb.from_user_avatar} 
                                  name={fb.from_user_name} 
                                  className="w-6 h-6 rounded-full border border-zinc-200" 
                                  iconSize={12}
                                />
                                <span className="text-xs font-bold text-zinc-700">{fb.from_user_name}</span>
                              </div>
                              <div className="flex text-amber-400 text-xs">
                                {Array.from({ length: fb.rating }).map((_, i) => <span key={i}>★</span>)}
                              </div>
                            </div>
                            <p className="text-sm text-zinc-600 italic">"{fb.comment}"</p>
                            <p className="text-[10px] text-zinc-400 text-right">
                              {new Date(fb.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 space-y-2">
                          <MessageSquare size={32} className="mx-auto text-zinc-200" />
                          <p className="text-sm text-zinc-400">No feedback received yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <header>
                <h2 className="text-3xl font-display font-bold">User Settings</h2>
                <p className="text-zinc-500">Manage your account, notifications, and privacy preferences.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-4">
                  <nav className="space-y-1">
                    {['Account', 'Notifications', 'Privacy', 'Billing'].map((item) => (
                      <button
                        key={item}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          item === 'Account' ? "bg-indigo-50 text-indigo-600" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="md:col-span-2 space-y-8">
                  {/* Account Section */}
                  <section className="glass rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <UserIcon size={20} className="text-zinc-400" /> Account Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Email Address</label>
                          <input 
                            type="email" 
                            defaultValue={user?.email}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-400 uppercase">Language</label>
                          <select className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
                            <option>English (US)</option>
                            <option>Spanish</option>
                            <option>French</option>
                            <option>German</option>
                          </select>
                        </div>
                      </div>
                      <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                        Change Password
                      </button>
                    </div>
                  </section>

                  {/* Notifications Section */}
                  <section className="glass rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Bell size={20} className="text-zinc-400" /> Notification Preferences
                    </h3>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Activity Alerts</p>
                        <SettingsToggle 
                          label="Skill Exchange Requests" 
                          description="Get notified when someone wants to learn from you."
                          icon={<Users size={18} />}
                          checked={notificationSettings.exchangeRequests}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, exchangeRequests: checked }))}
                        />
                        <SettingsToggle 
                          label="Lesson Completions" 
                          description="Receive alerts when students complete your micro-lessons."
                          icon={<CheckCircle size={18} />}
                          checked={notificationSettings.lessonCompletions}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, lessonCompletions: checked }))}
                        />
                        <SettingsToggle 
                          label="Feedback Received" 
                          description="Get notified when you receive new ratings or comments."
                          icon={<Star size={18} />}
                          checked={notificationSettings.feedbackReceived}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, feedbackReceived: checked }))}
                        />
                      </div>

                      <div className="pt-4 border-t border-zinc-100 space-y-3">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Channels</p>
                        <SettingsToggle 
                          label="Weekly Summaries" 
                          description="Receive a digest of your progress and community highlights."
                          icon={<Mail size={18} />}
                          checked={notificationSettings.weeklySummaries}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, weeklySummaries: checked }))}
                        />
                        <SettingsToggle 
                          label="Push Notifications" 
                          description="Get instant alerts for new messages and match requests."
                          icon={<Zap size={18} />}
                          checked={notificationSettings.pushAlerts}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, pushAlerts: checked }))}
                        />
                        <SettingsToggle 
                          label="Marketing Emails" 
                          description="Stay updated with new features and community news."
                          icon={<Sparkles size={18} />}
                          checked={notificationSettings.marketing}
                          onChange={(checked) => setNotificationSettings(prev => ({ ...prev, marketing: checked }))}
                        />
                      </div>
                    </div>
                  </section>

                  {/* Privacy Section */}
                  <section className="glass rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Shield size={20} className="text-zinc-400" /> Privacy & Security
                    </h3>
                    <div className="space-y-3">
                      <SettingsToggle 
                        label="Public Profile" 
                        description="Allow other users to find you in the Global Exchange."
                        icon={<Globe size={18} />}
                        checked={true}
                        onChange={() => {}}
                      />
                      <SettingsToggle 
                        label="Show Points" 
                        description="Display your total Aura points on the leaderboard."
                        icon={<Trophy size={18} />}
                        checked={true}
                        onChange={() => {}}
                      />
                      <SettingsToggle 
                        label="Two-Factor Authentication" 
                        description="Add an extra layer of security to your account."
                        icon={<Lock size={18} />}
                        checked={false}
                        onChange={() => {}}
                      />
                    </div>
                  </section>

                  {/* Billing Section */}
                  <section className="glass rounded-3xl p-8 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <CreditCard size={20} className="text-zinc-400" /> Subscription & Billing
                    </h3>
                    <div className="p-6 bg-indigo-600 rounded-2xl text-white space-y-4 shadow-lg shadow-indigo-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Current Plan</p>
                          <h4 className="text-2xl font-display font-bold">Aura Pro</h4>
                        </div>
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">Active</span>
                      </div>
                      <p className="text-sm text-indigo-50">Your next billing date is April 6, 2026.</p>
                      <button className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all">
                        Manage Subscription
                      </button>
                    </div>
                  </section>

                  {/* Sign Out Section */}
                  <section className="glass rounded-3xl p-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left space-y-1">
                      <h3 className="text-lg font-bold">Sign Out</h3>
                      <p className="text-sm text-zinc-500">Log out of your Aura account on this device.</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-95"
                    >
                      <LogOut size={20} />
                      Log Out
                    </button>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showClearChatConfirm && (
            <ConfirmationModal 
              title="Clear Chat History?"
              message="This will permanently delete your entire conversation with Aura. This action cannot be undone."
              confirmText="Clear History"
              onConfirm={handleClearHistory}
              onCancel={() => setShowClearChatConfirm(false)}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Mobile Nav */}
      <footer className="md:hidden sticky bottom-0 z-50 glass border-t border-zinc-200 px-6 py-3 flex justify-around">
        <MobileNavButton active={activeTab === 'coach'} onClick={() => setActiveTab('coach')} icon={<Brain size={20} />} />
        <MobileNavButton active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<Globe size={20} />} />
        <MobileNavButton active={activeTab === 'lessons'} onClick={() => setActiveTab('lessons')} icon={<BookOpen size={20} />} />
        <MobileNavButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} icon={<Trophy size={20} />} />
        <MobileNavButton active={activeTab === 'about'} onClick={() => setActiveTab('about')} icon={<Info size={20} />} />
        <MobileNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} />
      </footer>

      {/* Skill Offer Modal */}
      <AnimatePresence>
        {isOfferModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOfferModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold">Offer Your Skills</h3>
                  <p className="text-zinc-500 text-sm">Share your expertise with the global community and earn Aura points.</p>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const skills = formData.get('skills') as string;
                  const methods = Array.from(formData.getAll('methods')) as string[];
                  
                  if (user) {
                    const updatedUser = {
                      ...user,
                      skills_offered: skills,
                      exchange_methods: methods.join(', ')
                    };
                    await api.saveUser(updatedUser);
                    setUser(updatedUser);
                    setIsOfferModalOpen(false);
                    loadData(user.id);
                  }
                }}>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Skills You Offer</label>
                    <input 
                      name="skills"
                      type="text" 
                      defaultValue={user?.skills_offered}
                      placeholder="e.g. Python, Public Speaking, Yoga"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Preferred Exchange Methods</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Video Call', 'Chat', 'In-person', 'Email', 'Screen Share', 'Voice Call'].map(method => (
                        <label key={method} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            name="methods" 
                            value={method} 
                            defaultChecked={user?.exchange_methods.includes(method)}
                            className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-zinc-700">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsOfferModalOpen(false)}
                      className="flex-1 py-3 border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lesson Create Modal */}
      <AnimatePresence>
        {isLessonCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLessonCreateModalOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-bold">Create Micro-Lesson</h3>
                  <p className="text-zinc-500 text-sm">Contribute to the community by sharing a quick, actionable lesson.</p>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  
                  if (user) {
                    const newLesson = {
                      id: `lesson-${Date.now()}`,
                      title: formData.get('title') as string,
                      skill_tag: formData.get('skill_tag') as string,
                      duration_mins: parseInt(formData.get('duration') as string),
                      content: formData.get('content') as string,
                      author_id: user.id
                    };
                    await api.saveLesson(newLesson);
                    setIsLessonCreateModalOpen(false);
                    loadData(user.id);
                  }
                }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Lesson Title</label>
                      <input 
                        name="title"
                        type="text" 
                        placeholder="e.g. 5 Tips for Better Focus"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Skill Category</label>
                      <input 
                        name="skill_tag"
                        type="text" 
                        placeholder="e.g. Productivity, Design"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Duration (minutes)</label>
                    <input 
                      name="duration"
                      type="number" 
                      min="1"
                      max="60"
                      defaultValue="5"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Lesson Content (Markdown supported)</label>
                    <textarea 
                      name="content"
                      placeholder="Share your knowledge here..."
                      rows={6}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsLessonCreateModalOpen(false)}
                      className="flex-1 py-3 border border-zinc-200 rounded-xl text-sm font-bold hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                    >
                      Publish Lesson
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feedback Modal from Active Exchanges */}
      {feedbackTarget && user && (
        <FeedbackModal 
          matchId={feedbackTarget.matchId}
          fromUserId={user.id}
          toUserId={feedbackTarget.toUserId}
          toUserName={feedbackTarget.toUserName}
          onClose={() => setFeedbackTarget(null)}
          onSuccess={() => {
            setFeedbackTarget(null);
            loadData(user.id);
          }}
        />
      )}
    </div>
  );
}

function AchievementBadge({ icon, label, description }: { icon: string, label: string, description?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-100 group relative">
      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-zinc-800">{label}</span>
        {description && <span className="text-[10px] text-zinc-400">{description}</span>}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-2 px-1 border-b-2 transition-all duration-200",
        active ? "border-indigo-600 text-indigo-600" : "border-transparent text-zinc-500 hover:text-zinc-800"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-3 rounded-2xl transition-all",
        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-zinc-400"
      )}
    >
      {icon}
    </button>
  );
}

function SuggestionCard({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-3 text-xs text-left bg-white border border-zinc-100 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-zinc-600"
    >
      {text}
    </button>
  );
}

function MatchCard({ user, currentUser, onComplete }: { user: User, currentUser: User | null, onComplete?: () => void }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [lastMatchId, setLastMatchId] = useState<string | null>(null);

  const handleRequest = async () => {
    if (!currentUser) return;
    setIsRequesting(true);
    try {
      const data = await api.createMatch(currentUser.id, user.id, user.skills_offered.split(',')[0]);
      if (data) {
        setLastMatchId(data.matchId);
        setIsRequested(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 card-hover border-zinc-100 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm">{user.name}</h4>
              <p className="text-xs text-zinc-400">Verified Expert</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            <Zap size={12} /> Match
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase">Offers</p>
          <p className="text-sm text-zinc-700">{user.skills_offered}</p>
        </div>
        {user.exchange_methods && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-400 uppercase">Methods</p>
            <div className="flex flex-wrap gap-1">
              {user.exchange_methods.split(', ').map(m => (
                <span key={m} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 space-y-2">
        {isRequested ? (
          <div className="space-y-2">
            <div className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2">
              <Sparkles size={14} /> Request Sent
            </div>
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Complete & Feedback
            </button>
          </div>
        ) : (
          <button 
            onClick={handleRequest}
            disabled={isRequesting}
            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-[0.98]"
          >
            {isRequesting ? "Sending..." : "Learn Skill"}
          </button>
        )}
      </div>

      {showFeedbackModal && lastMatchId && currentUser && (
        <FeedbackModal 
          matchId={lastMatchId}
          fromUserId={currentUser.id}
          toUserId={user.id}
          toUserName={user.name}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={() => {
            setShowFeedbackModal(false);
            if (onComplete) onComplete();
          }}
        />
      )}
    </div>
  );
}

function FeedbackModal({ matchId, fromUserId, toUserId, toUserName, onClose, onSuccess }: { 
  matchId: string, 
  fromUserId: string, 
  toUserId: string, 
  toUserName: string,
  onClose: () => void,
  onSuccess: () => void
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.completeMatch(fromUserId, matchId);
      await api.submitFeedback({
        match_id: matchId,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        rating,
        comment
      });
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-2">
            <Sparkles size={32} />
          </div>
          <h3 className="text-2xl font-display font-bold">Session Feedback</h3>
          <p className="text-zinc-500 text-sm">How was your skill exchange with {toUserName}?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={cn(
                  "text-2xl transition-all hover:scale-110",
                  rating >= star ? "text-amber-400" : "text-zinc-200"
                )}
              >
                ★
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-400 uppercase">Your Experience</label>
            <textarea 
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you learn? How was the session?"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-24 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit & Complete'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SettingsToggle({ label, description, icon, checked, onChange }: { 
  label: string, 
  description: string, 
  icon: React.ReactNode, 
  checked: boolean, 
  onChange: (checked: boolean) => void 
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-zinc-400 shadow-sm">
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-700">{label}</p>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative",
          checked ? "bg-indigo-600" : "bg-zinc-200"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
          checked ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  );
}

function LessonCard({ lesson, currentUser, onComplete }: { lesson: Partial<Lesson>, currentUser: User | null, onComplete: () => void }) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleComplete = async () => {
    if (!currentUser || !lesson.id) return;
    setIsCompleting(true);
    try {
      await api.completeLesson(currentUser.id, lesson.id);
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!lesson.id) return;
    setIsDeleting(true);
    try {
      await api.deleteLesson(lesson.id);
      onComplete();
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isAuthor = currentUser?.id === lesson.author_id;

  return (
    <div className="glass rounded-2xl overflow-hidden card-hover border-zinc-100 flex flex-col relative group">
      {isAuthor && (
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-zinc-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete Lesson"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="h-32 bg-indigo-50 flex items-center justify-center text-indigo-200">
        <BookOpen size={48} />
      </div>
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
            {lesson.skill_tag}
          </span>
          <span className="text-xs text-zinc-400 flex items-center gap-1">
            <Zap size={12} /> {lesson.duration_mins} min
          </span>
        </div>
        <h4 className="font-bold text-zinc-900 leading-tight flex-1">{lesson.title}</h4>
        <div className="flex items-center justify-between pt-2">
          <button className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-indigo-600 transition-colors group">
            Read <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={handleComplete}
            disabled={isCompleting}
            className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isCompleting ? "..." : "Mark Complete"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmationModal 
            title="Delete Lesson?"
            message={`Are you sure you want to delete "${lesson.title}"? This action cannot be undone.`}
            confirmText={isDeleting ? "Deleting..." : "Delete Lesson"}
            onConfirm={handleDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            variant="danger"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ConfirmationModal({ 
  title, 
  message, 
  confirmText, 
  onConfirm, 
  onCancel,
  variant = 'danger'
}: { 
  title: string, 
  message: string, 
  confirmText: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  variant?: 'danger' | 'warning'
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
      >
        <div className="text-center space-y-4">
          <div className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto",
            variant === 'danger' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          )}>
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold">{title}</h3>
            <p className="text-zinc-500 text-sm">{message}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-zinc-100 text-zinc-600 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 py-3 text-white rounded-xl text-sm font-bold transition-all shadow-lg",
              variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-100" : "bg-amber-600 hover:bg-amber-700 shadow-amber-100"
            )}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

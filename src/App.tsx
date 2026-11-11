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
  AlertCircle,
  Users,
  CheckCircle,
  CheckCircle2,
  Star,
  Info,
  LogOut,
  ArrowLeft,
  Clock,
  Camera,
  Upload,
  RefreshCw,
  Award,
  BookmarkCheck,
  FileText,
  Key,
  X,
  Mic,
  MicOff,
  Radio,
  Volume2,
  VolumeX,
  ExternalLink,
  Square,
  PhoneCall,
  PhoneOff,
  SearchCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from './api';
import { User, Lesson, ChatMessage, LessonCompletion } from './types';
import { getCoachResponse, transcribeAudio, LiveVoiceSession, GroundingSource } from './services/geminiService';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, onAuthStateChanged, signOut, db } from './lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Login } from './components/Login';
import { PasswordSettings } from './components/PasswordSettings';
import { LessonCoverUpload } from './components/LessonCoverUpload';
import { AchievementList } from './components/AchievementList';
import { computeUserAchievements } from './lib/achievements';
import { SubscriptionModal } from './components/SubscriptionModal';

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

const DEMO_LESSONS: Lesson[] = [
  {
    id: 'demo-1',
    title: 'Mastering the 2-Minute Rule',
    skill_tag: 'Productivity',
    duration_mins: 5,
    author_id: 'Aura Core',
    cover_image_url: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
    cover_image_source: 'fallback',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    content: `### The 2-Minute Rule for Immediate Momentum

If an action takes two minutes or less to do, **do it right now**.

#### Why This Works
- **Stops Mental Fragmentation**: Tiny open loops create cognitive clutter and anxiety.
- **Lowers Activation Threshold**: Starting is the most challenging cognitive step. Once in motion, staying in motion is natural.
- **Automates Decision-Making**: No need to schedule or defer micro-tasks.

#### Core Guidelines
1. **Estimate Instantly**: When a small request arrives, ask: *Will this take less than 120 seconds?*
2. **Execute Without Hesitation**: Knock it out immediately before context switching.
3. **Compound Gains**: Dozens of small cleared tasks prevent afternoon backlogs and dread.

> *"Action produces clarity far more reliably than thought."*

#### Practical Challenge Today
Identify one unread email or single messy surface on your desk right now. Spend the next 90 seconds completing it!`
  },
  {
    id: 'demo-2',
    title: 'Basic Sourdough Starter Maintenance',
    skill_tag: 'Culinary',
    duration_mins: 8,
    author_id: 'Chef Mario',
    cover_image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    cover_image_source: 'fallback',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    content: `### Sourdough Starter Fundamentals

A sourdough starter is a living colony of wild yeasts and beneficial lactic acid bacteria that requires steady, simple nourishment.

#### Standard Feeding Ratio (1:1:1 by weight)
- **1 part** active mature starter (50g)
- **1 part** unbleached bread flour or rye blend (50g)
- **1 part** clean lukewarm water (~75°F / 24°C, 50g)

#### Step-by-Step Care
1. **Discard**: Discard half of your existing starter to balance volume and acid build-up.
2. **Add Ingredients**: Add fresh flour and lukewarm water in equal weights.
3. **Mix Thoroughly**: Stir with a spatula until smooth with no dry flour streaks.
4. **Mark and Rest**: Place an elastic band at the current height of your jar.
5. **Observe**: When the starter doubles with airy bubbles within 4–6 hours, it is at peak leavening power.

*Pro-Tip: Store in the refrigerator between weekly bakes to slow down feedings.*`
  },
  {
    id: 'demo-3',
    title: 'Intro to UI Grid Systems & Spatial Scales',
    skill_tag: 'Design',
    duration_mins: 10,
    author_id: 'Design Pro',
    cover_image_url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80',
    cover_image_source: 'fallback',
    created_at: new Date(Date.now() - 259200000).toISOString(),
    content: `### The 8-Point Spatial System

Professional user interfaces feel effortless because every spacing decision adheres to a mathematical rhythm.

#### Why the 8-Point Grid?
- **Universal Multiples**: Virtually all mobile, tablet, and desktop display dimensions divide evenly into 8 (and its sub-unit 4).
- **Eliminates Ambiguity**: Designers and developers never argue over 13px vs 15px margins. Values snap to **4, 8, 16, 24, 32, 48, 64px**.
- **Visual Rhythm**: Components, cards, and typography balance naturally without visual vibration.

#### Spacing Guidelines
1. **Micro-spacing (4px)**: Use for pill badges, tag padding, icon-to-text spacing.
2. **Standard spacing (8px–16px)**: Form fields, card item gaps, list row padding.
3. **Macro-spacing (24px–64px)**: Section margins, modal containers, and page gutters.

*Try auditing a component today by snapping all arbitrary pixel paddings to 8px increments!*`
  }
];

const DEMO_SKILL_USERS: User[] = [
  {
    id: 'demo-expert-1',
    name: 'Elena Rostova',
    username: 'elena_data',
    bio: 'Data engineer and automation enthusiast. Loves building clean pipelines and mentoring in Python.',
    email: 'elena.rostova@auracommunity.org',
    points: 480,
    skills_offered: 'Python Data Science, Automation Scripts, Pandas',
    skills_needed: 'Spanish Conversation, UI/UX Design',
    exchange_methods: 'Video Call, Screen Share, Chat',
    completed_lessons_count: 14,
    completed_matches_count: 18,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'demo-expert-2',
    name: 'Marcus Vance',
    username: 'marcus_speaks',
    bio: 'Executive pitch coach and keynote speaker. Helping founders articulate their vision with charisma.',
    email: 'marcus.vance@auracoach.io',
    points: 620,
    skills_offered: 'Public Speaking, Pitch Deck Delivery, Executive Presence',
    skills_needed: 'React Basics, Prompt Engineering',
    exchange_methods: 'Video Call, In-person',
    completed_lessons_count: 22,
    completed_matches_count: 31,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'demo-expert-3',
    name: 'Sarah Chen',
    username: 'sarah_design',
    bio: 'Product designer focusing on accessible systems and typography in web interfaces.',
    email: 'sarah.chen@auraglobal.dev',
    points: 390,
    skills_offered: 'Figma Systems, Design Tokens, Mobile UX Flow',
    skills_needed: 'SEO Optimization, Technical Writing',
    exchange_methods: 'Screen Share, Chat',
    completed_lessons_count: 11,
    completed_matches_count: 15,
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'coach' | 'exchange' | 'lessons' | 'leaderboard' | 'profile' | 'settings' | 'about'>('coach');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedSkillUser, setSelectedSkillUser] = useState<User | null>(null);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
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
  
  // Gemini 3.8 Flash Google Search Grounding state
  const [useSearchGrounding, setUseSearchGrounding] = useState<boolean>(true);

  // Gemini 3.5 Transcribe audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const [micPermissionNotice, setMicPermissionNotice] = useState<string | null>(null);

  // Gemini 3.8 Live API real-time voice session state
  const [showLiveVoiceModal, setShowLiveVoiceModal] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveAuraTranscript, setLiveAuraTranscript] = useState('');
  const [liveTranscriptLog, setLiveTranscriptLog] = useState<{ speaker: 'user' | 'aura'; text: string; time: string }[]>([]);
  const [isLiveMuted, setIsLiveMuted] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveSessionRef = useRef<LiveVoiceSession | null>(null);
  const liveTranscriptEndRef = useRef<HTMLDivElement | null>(null);
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
  const [newLessonCoverUrl, setNewLessonCoverUrl] = useState<string>('');
  const [newLessonCoverSource, setNewLessonCoverSource] = useState<'ai' | 'upload' | 'fallback'>('ai');
  const [completedLessonsList, setCompletedLessonsList] = useState<LessonCompletion[]>([]);
  const [profileSubTab, setProfileSubTab] = useState<'details' | 'completed' | 'achievements'>('details');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState(0);
  const [avatarStatusMsg, setAvatarStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; subtitle: string; points: number } | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [feedbackTarget, setFeedbackTarget] = useState<{ matchId: string, toUserId: string, toUserName: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings and preferences state
  const [settingsSubTab, setSettingsSubTab] = useState<'all' | 'account' | 'notifications' | 'privacy' | 'billing'>('all');
  const [preferredLanguage, setPreferredLanguage] = useState<string>(() => {
    try {
      return localStorage.getItem('aura_preferred_lang') || 'English (US)';
    } catch {
      return 'English (US)';
    }
  });
  const [accountSaveStatus, setAccountSaveStatus] = useState<string | null>(null);
  const [privacySettings, setPrivacySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('aura_privacy_settings');
      return saved ? JSON.parse(saved) : { publicProfile: true, showPoints: true, twoFactor: false };
    } catch {
      return { publicProfile: true, showPoints: true, twoFactor: false };
    }
  });
  const [privacySaveMsg, setPrivacySaveMsg] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);

  // Micro-lessons search and category filter state
  const [lessonSearchQuery, setLessonSearchQuery] = useState('');
  const [selectedLessonCategory, setSelectedLessonCategory] = useState<string>('All');

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
              username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'aura_learner',
              bio: '',
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
          const fallbackUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Learner',
            username: firebaseUser.email ? firebaseUser.email.split('@')[0] : 'aura_learner',
            bio: '',
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
      const [l, m, am, lb, fb, completedIds, compList] = await Promise.allSettled([
        api.getLessons(),
        api.getMatches(userId),
        api.getActiveMatches(userId),
        api.getUsers(),
        api.getFeedback(userId),
        api.getCompletedLessonIds(userId),
        api.getCompletedLessons(userId)
      ]);

      if (l.status === 'fulfilled') setLessons(l.value);
      if (m.status === 'fulfilled') setMatches(m.value);
      if (am.status === 'fulfilled') setActiveMatches(am.value);
      if (lb.status === 'fulfilled') setLeaderboard(lb.value);
      if (completedIds.status === 'fulfilled') setCompletedLessonIds(completedIds.value);
      if (compList.status === 'fulfilled') setCompletedLessonsList(compList.value);
      
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

  const handleCompleteLesson = async (lessonId: string) => {
    if (!user) return;
    try {
      const targetLesson = lessons.find(l => l.id === lessonId) || DEMO_LESSONS.find(l => l.id === lessonId);
      await api.completeLesson(user.id, lessonId, targetLesson?.title, targetLesson?.skill_tag);
      
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.65 }
        });
      } catch (_) {}

      setCelebration({
        title: 'Micro-Lesson Mastered! +10 XP',
        subtitle: targetLesson?.title ? `Completed "${targetLesson.title}"` : 'Great step on your learning journey!',
        points: 10
      });
      setTimeout(() => setCelebration(null), 4000);

      setCompletedLessonIds(prev => prev.includes(lessonId) ? prev : [...prev, lessonId]);
      await loadData(user.id);
    } catch (error) {
      console.error("Failed to complete lesson:", error);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarStatusMsg(null);
    setAvatarUploading(true);
    setAvatarProgress(0);

    try {
      const downloadUrl = await api.uploadProfileAvatar(user.id, file, (progress) => {
        setAvatarProgress(progress);
      });

      const updatedUser = { ...user, avatar_url: downloadUrl };
      await api.saveUser(updatedUser);
      setUser(updatedUser);
      setAvatarStatusMsg({ type: 'success', text: 'Profile picture updated successfully!' });
      await loadData(user.id);
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setAvatarStatusMsg({ type: 'error', text: err?.message || 'Failed to upload image.' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setAvatarStatusMsg(null);
    try {
      const updatedUser = { ...user, avatar_url: '' };
      await api.saveUser(updatedUser);
      setUser(updatedUser);
      setAvatarStatusMsg({ type: 'success', text: 'Profile picture removed.' });
      await loadData(user.id);
    } catch (err: any) {
      console.error('Remove avatar error:', err);
      setAvatarStatusMsg({ type: 'error', text: 'Failed to remove profile picture.' });
    }
  };

  const handleRegenerateReaderCover = async (lesson: Lesson) => {
    try {
      const res = await api.generateAndSaveLessonCover(lesson.title, lesson.skill_tag, lesson.content, lesson.id);
      const updatedLesson = { ...lesson, cover_image_url: res.coverUrl, cover_image_source: res.source };
      await api.saveLesson(updatedLesson);
      setSelectedLesson(updatedLesson);
      if (user) await loadData(user.id);
    } catch (err) {
      console.error('Cover regeneration error:', err);
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
      const response = await getCoachResponse(history, useSearchGrounding);
      setChatHistory(prev => [
        ...prev,
        {
          role: 'model',
          text: response?.text || "I'm here to help.",
          groundingSources: response?.groundingSources
        }
      ]);
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

  // Audio transcription (gemini-3.5-transcribe) recording handlers
  const startRecordingAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        // Release mic stream tracks
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          setIsTranscribing(true);
          try {
            const transcriptText = await transcribeAudio(audioBlob);
            if (transcriptText.trim()) {
              setInput((prev) => (prev ? `${prev} ${transcriptText.trim()}` : transcriptText.trim()));
            }
          } catch (transcribeErr: any) {
            console.error("Audio transcription error:", transcribeErr);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access denied for transcription:", err);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        (typeof err?.message === 'string' && (err.message.includes('Permission') || err.message.includes('denied')));
      const msg = isPermissionDenied
        ? "Microphone access was denied. Please allow microphone permissions in your browser address bar or site settings to transcribe audio."
        : (err?.message || "Could not access microphone.");
      setMicPermissionNotice(msg);
      setTimeout(() => setMicPermissionNotice(null), 8000);
    }
  };

  const stopRecordingAudio = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecordingAudio = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Real-time Live API voice conversation (gemini-3.8-live) handlers
  const startLiveVoiceSession = async () => {
    setShowLiveVoiceModal(true);
    setLiveError(null);
    setLiveUserTranscript('');
    setLiveAuraTranscript('');
    setLiveTranscriptLog([]);
    setIsLiveMuted(false);

    const session = new LiveVoiceSession();
    liveSessionRef.current = session;

    session.onStatusChange = (status) => {
      setLiveStatus(status);
    };

    session.onError = (err) => {
      setLiveError(err);
    };

    session.onTranscript = (data) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (data.user) {
        setLiveUserTranscript(data.user);
        setLiveTranscriptLog((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === 'user') {
            return [...prev.slice(0, -1), { speaker: 'user', text: `${last.text} ${data.user}`, time: timeStr }];
          }
          return [...prev, { speaker: 'user', text: data.user!, time: timeStr }];
        });
      }
      if (data.aura) {
        setLiveAuraTranscript(data.aura);
        setLiveTranscriptLog((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === 'aura') {
            return [...prev.slice(0, -1), { speaker: 'aura', text: `${last.text} ${data.aura}`, time: timeStr }];
          }
          return [...prev, { speaker: 'aura', text: data.aura!, time: timeStr }];
        });
      }
      setTimeout(() => {
        liveTranscriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    };

    session.onInterrupted = () => {
      // Handled inside session stopPlayback
    };

    try {
      await session.start();
    } catch (err: any) {
      console.error("LiveVoiceSession start error:", err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        (typeof err?.message === 'string' && (err.message.includes('Permission') || err.message.includes('denied')));
      setLiveError(
        isPermissionDenied
          ? "Microphone access was denied. Please allow microphone permissions in your browser address bar to speak with Aura."
          : (err?.message || "Could not access microphone or connect to Live API.")
      );
    }
  };

  const toggleLiveMute = () => {
    if (liveSessionRef.current) {
      const muted = liveSessionRef.current.toggleMute();
      setIsLiveMuted(muted);
    }
  };

  const interruptLivePlayback = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.stopPlayback();
      setLiveStatus('listening');
    }
  };

  const endLiveVoiceSession = (saveToChat: boolean = true) => {
    if (liveSessionRef.current) {
      liveSessionRef.current.stop();
      liveSessionRef.current = null;
    }
    setLiveStatus('disconnected');

    if (saveToChat && liveTranscriptLog.length > 0) {
      const voiceMessages: ChatMessage[] = liveTranscriptLog.map((item) => ({
        role: item.speaker === 'user' ? 'user' : 'model',
        text: item.text,
        isVoice: true,
      }));
      setChatHistory((prev) => [...prev, ...voiceMessages]);
    }

    setShowLiveVoiceModal(false);
  };

  const navigateToTab = (tab: 'coach' | 'exchange' | 'lessons' | 'leaderboard' | 'profile' | 'settings' | 'about') => {
    setActiveTab(tab);
    setSelectedLesson(null);
    setSelectedSkillUser(null);
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
            <NavButton active={activeTab === 'coach'} onClick={() => navigateToTab('coach')} icon={<Brain size={18} />} label="AI Coach" />
            <NavButton active={activeTab === 'exchange'} onClick={() => navigateToTab('exchange')} icon={<Globe size={18} />} label="Exchange" />
            <NavButton active={activeTab === 'lessons'} onClick={() => navigateToTab('lessons')} icon={<BookOpen size={18} />} label="Micro-Lessons" />
            <NavButton active={activeTab === 'leaderboard'} onClick={() => navigateToTab('leaderboard')} icon={<Trophy size={18} />} label="Leaderboard" />
            <NavButton active={activeTab === 'about'} onClick={() => navigateToTab('about')} icon={<Info size={18} />} label="About" />
            <NavButton active={activeTab === 'settings'} onClick={() => navigateToTab('settings')} icon={<Settings size={18} />} label="Settings" />
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
                <div className="p-3 md:p-4 border-b border-zinc-100 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Brain size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold text-sm">Aura AI Coach</h2>
                        <span className="text-[10px] bg-indigo-100/70 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium hidden sm:inline">
                          gemini-3.8-flash
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">Always active • Personalized for {user?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Google Search Grounding Toggle */}
                    <button
                      type="button"
                      onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all border",
                        useSearchGrounding
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
                          : "bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                      )}
                      title="Toggle Google Search data grounding for up-to-date accurate insights"
                    >
                      <Globe size={13} className={useSearchGrounding ? "text-emerald-600" : "text-zinc-400"} />
                      <span className="hidden sm:inline">Google Search</span>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        useSearchGrounding ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                      )} />
                    </button>

                    {/* Gemini 3.8 Live API Voice Call Button */}
                    <button
                      type="button"
                      onClick={startLiveVoiceSession}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                      title="Open real-time voice conversation with gemini-3.8-live"
                    >
                      <Radio size={13} className="animate-pulse text-indigo-200" />
                      <span>Live Voice</span>
                      <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded font-mono font-normal hidden sm:inline">3.8 Live</span>
                    </button>

                    <div className="w-px h-4 bg-zinc-200 mx-0.5 hidden sm:block" />

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
                    <div className="w-px h-4 bg-zinc-200 mx-0.5" />
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

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4 p-4">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-2">
                        <MessageSquare size={32} className="hidden md:block" />
                        <MessageSquare size={24} className="md:hidden" />
                      </div>
                      <h3 className="text-lg md:text-xl font-display font-bold">What's on your mind today?</h3>
                      <p className="text-zinc-500 text-xs md:text-sm">
                        Ask questions with <span className="font-semibold text-emerald-600">Google Search data</span>, tap the microphone to <span className="font-semibold text-indigo-600">transcribe your voice</span> with gemini-3.5-transcribe, or start a <span className="font-semibold text-violet-600">Live Voice session</span> with gemini-3.8-live.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-4">
                        <SuggestionCard text="Latest trends in prompt engineering" onClick={() => setInput("What are the latest breakthrough trends in prompt engineering and generative AI?")} />
                        <SuggestionCard text="How to structure high-impact micro-lessons" onClick={() => setInput("What are the best frameworks to structure high-impact 5-minute micro-lessons?")} />
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
                          {msg.isVoice && (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100 mb-2">
                              <Radio size={11} className="animate-pulse" />
                              <span>Live Voice Note</span>
                            </div>
                          )}
                          <div className={cn("markdown-body", msg.role === 'user' && "user-markdown-body")}>
                            <Markdown>{msg.text}</Markdown>
                          </div>

                          {/* Google Search Grounding Sources Display */}
                          {msg.groundingSources && msg.groundingSources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-col gap-1.5 text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                                <Globe size={12} className="text-emerald-600" />
                                <span>Google Search Grounded Sources:</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.groundingSources.map((source, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-50 hover:bg-emerald-50 text-zinc-700 hover:text-emerald-700 border border-zinc-200 hover:border-emerald-200 rounded-lg text-[11px] transition-colors max-w-full"
                                    title={source.title}
                                  >
                                    <span className="truncate max-w-[200px]">{source.title}</span>
                                    <ExternalLink size={10} className="shrink-0 opacity-60" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 px-1">
                          {msg.role === 'user' ? 'Sent' : 'Aura AI (gemini-3.8-flash)'}
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

                {/* Bottom Input Area with Audio Transcription (gemini-3.5-transcribe) */}
                <div className="p-3 md:p-4 bg-white border-t border-zinc-100">
                  {micPermissionNotice && (
                    <div className="mb-2.5 p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={15} className="text-amber-600 shrink-0" />
                        <span>{micPermissionNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMicPermissionNotice(null)}
                        className="text-amber-600 hover:text-amber-800 p-0.5 rounded cursor-pointer"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  {isRecording ? (
                    <div className="flex items-center justify-between gap-3 bg-red-50/90 border border-red-200 rounded-2xl py-3 px-4 animate-in fade-in">
                      <div className="flex items-center gap-2.5 text-red-600 font-medium text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        <span>Recording audio... ({recordingSeconds}s)</span>
                      </div>
                      <div className="flex-1 hidden sm:flex items-center justify-center gap-1">
                        {[...Array(12)].map((_, i) => (
                          <span
                            key={i}
                            className="w-1 bg-red-400 rounded-full animate-pulse"
                            style={{
                              height: `${10 + (i % 4) * 6}px`,
                              animationDelay: `${i * 100}ms`
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelRecordingAudio}
                          className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={stopRecordingAudio}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                        >
                          <Square size={12} fill="white" />
                          <span>Transcribe with 3.5</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={
                          isTranscribing 
                            ? "Transcribing audio with gemini-3.5-transcribe..." 
                            : useSearchGrounding 
                              ? "Ask Aura anything (Google Search grounded)..." 
                              : "Ask Aura anything..."
                        }
                        disabled={isTranscribing}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl py-3 md:py-4 pl-4 md:pl-6 pr-24 md:pr-28 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400 disabled:opacity-60"
                      />
                      <div className="absolute right-1.5 md:right-2 flex items-center gap-1">
                        {/* Audio Transcription Mic Button (gemini-3.5-transcribe) */}
                        <button
                          type="button"
                          onClick={startRecordingAudio}
                          disabled={isTyping || isTranscribing}
                          className={cn(
                            "p-2.5 md:p-3 rounded-xl transition-all",
                            isTranscribing
                              ? "bg-amber-100 text-amber-700 animate-pulse"
                              : "text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50"
                          )}
                          title="Click to speak and transcribe with gemini-3.5-transcribe"
                        >
                          <Mic size={18} className={isTranscribing ? "animate-spin" : ""} />
                        </button>

                        <button 
                          type="button"
                          onClick={handleSendMessage}
                          disabled={!input.trim() || isTyping || isTranscribing}
                          className="p-2.5 md:p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md shadow-indigo-100 active:scale-95"
                          title="Send message"
                        >
                          <Send size={18} className="hidden md:block" />
                          <Send size={16} className="md:hidden" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gemini 3.8 Live API Voice Call Modal */}
              <AnimatePresence>
                {showLiveVoiceModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-zinc-100 flex flex-col max-h-[90vh]"
                    >
                      {/* Modal Header */}
                      <div className="p-4 md:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm">
                            <Radio size={16} className="animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-zinc-900">Aura Live Voice Session</h3>
                              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                                gemini-3.8-live
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500">Real-time bidirectional voice conversation</p>
                          </div>
                        </div>
                        <button
                          onClick={() => endLiveVoiceSession(false)}
                          className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Visualizer & Status Area */}
                      <div className="p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-indigo-50/40 to-transparent">
                        <div className="relative w-36 h-36 flex items-center justify-center mb-5">
                          {/* Pulsing Concentric Aura Waves */}
                          <div
                            className={cn(
                              "absolute inset-0 rounded-full transition-all duration-700",
                              liveStatus === 'speaking'
                                ? "bg-violet-400/25 animate-ping"
                                : liveStatus === 'listening'
                                ? "bg-indigo-300/20 animate-pulse"
                                : "bg-zinc-200/40"
                            )}
                          />
                          <div
                            className={cn(
                              "absolute inset-3 rounded-full transition-all duration-500",
                              liveStatus === 'speaking'
                                ? "bg-violet-500/20 animate-pulse"
                                : liveStatus === 'listening'
                                ? "bg-indigo-400/15"
                                : "bg-zinc-100"
                            )}
                          />
                          {/* Center Orb */}
                          <div
                            className={cn(
                              "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300",
                              liveStatus === 'speaking'
                                ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white scale-110 shadow-violet-300"
                                : liveStatus === 'listening'
                                ? "bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-indigo-200"
                                : liveStatus === 'connecting'
                                ? "bg-amber-500 text-white animate-spin shadow-amber-200"
                                : "bg-zinc-300 text-zinc-600"
                            )}
                          >
                            {liveStatus === 'speaking' ? (
                              <Volume2 size={32} className="animate-bounce [animation-duration:1s]" />
                            ) : liveStatus === 'listening' ? (
                              <Mic size={32} className={isLiveMuted ? "opacity-40" : ""} />
                            ) : liveStatus === 'connecting' ? (
                              <RefreshCw size={28} />
                            ) : (
                              <MicOff size={28} />
                            )}
                          </div>
                        </div>

                        {/* Status Label */}
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-zinc-800">
                            {liveStatus === 'connecting' && "Connecting to Gemini 3.8 Live API..."}
                            {liveStatus === 'connected' && "Connected! Speak to Aura naturally."}
                            {liveStatus === 'listening' && (isLiveMuted ? "Microphone muted" : "Listening to your voice...")}
                            {liveStatus === 'speaking' && "Aura is responding..."}
                            {liveStatus === 'disconnected' && "Voice call disconnected."}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {liveStatus === 'speaking'
                              ? "Live 24kHz audio streaming • Tap 'Interrupt' to cut in"
                              : "Speak freely; Aura processes low-latency audio in real-time."}
                          </p>
                          {liveError && (
                            <p className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-lg border border-red-200 mt-2 font-medium">
                              {liveError}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live Transcript Stream */}
                      <div className="flex-1 overflow-y-auto px-5 py-3 border-y border-zinc-100 bg-zinc-50/30 max-h-48 min-h-[120px] space-y-2.5 text-xs">
                        {liveTranscriptLog.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-zinc-400 italic text-center py-6">
                            Transcripts from gemini-3.8-live will stream here in real time...
                          </div>
                        ) : (
                          liveTranscriptLog.map((log, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "p-2.5 rounded-xl leading-relaxed flex flex-col gap-0.5",
                                log.speaker === 'user'
                                  ? "bg-indigo-50 border border-indigo-100 text-indigo-950 ml-6"
                                  : "bg-white border border-zinc-200 text-zinc-800 mr-6"
                              )}
                            >
                              <div className="flex items-center justify-between text-[10px] font-semibold opacity-70">
                                <span>{log.speaker === 'user' ? 'You' : 'Aura (3.8 Live)'}</span>
                                <span>{log.time}</span>
                              </div>
                              <p className="text-xs font-normal">{log.text}</p>
                            </div>
                          ))
                        )}
                        <div ref={liveTranscriptEndRef} />
                      </div>

                      {/* Modal Controls */}
                      <div className="p-4 bg-white flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {/* Mute Button */}
                          <button
                            type="button"
                            onClick={toggleLiveMute}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                              isLiveMuted
                                ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                            )}
                          >
                            {isLiveMuted ? <MicOff size={15} /> : <Mic size={15} />}
                            <span>{isLiveMuted ? "Unmute" : "Mute"}</span>
                          </button>

                          {/* Interrupt Button */}
                          {liveStatus === 'speaking' && (
                            <button
                              type="button"
                              onClick={interruptLivePlayback}
                              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors"
                              title="Interrupt Aura's speech"
                            >
                              <VolumeX size={15} />
                              <span>Interrupt</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => endLiveVoiceSession(false)}
                            className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors"
                          >
                            End Call
                          </button>
                          <button
                            type="button"
                            onClick={() => endLiveVoiceSession(true)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all active:scale-95"
                          >
                            <PhoneOff size={14} />
                            <span>Save & Close</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'exchange' && (
            selectedSkillUser ? (
              <motion.div 
                key={`skill-detail-${selectedSkillUser.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {/* Navigation Back Header */}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedSkillUser(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-sm text-zinc-700 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    Back to Skill Exchange
                  </button>

                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                    Skill Exchange Profile
                  </span>
                </div>

                {/* Skill Detail Card */}
                <div className="glass rounded-3xl p-8 md:p-10 space-y-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
                    <div className="flex items-center gap-4">
                      <UserAvatar 
                        src={selectedSkillUser.avatar_url} 
                        name={selectedSkillUser.name} 
                        className="w-16 h-16 rounded-2xl shadow-md" 
                        iconSize={32}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-display font-bold text-zinc-900">{selectedSkillUser.name}</h2>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                            Verified Mentor
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{selectedSkillUser.email || 'Community Member'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-center">
                      <div className="px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-400 font-bold uppercase">Points</p>
                        <p className="text-lg font-bold text-indigo-600">{selectedSkillUser.points || 0}</p>
                      </div>
                      <div className="px-4 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                        <p className="text-xs text-zinc-400 font-bold uppercase">Exchanges</p>
                        <p className="text-lg font-bold text-zinc-900">{selectedSkillUser.completed_matches_count || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/60">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-indigo-600" /> Skills Offered
                      </h3>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedSkillUser.skills_offered ? (
                          selectedSkillUser.skills_offered.split(',').map((s, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white text-indigo-700 text-xs font-bold rounded-lg shadow-sm border border-indigo-100">
                              {s.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-zinc-500">General Mentorship</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 pt-2 leading-relaxed">
                        Ready to share practical knowledge, review concepts, and collaborate through peer exchange.
                      </p>
                    </div>

                    <div className="space-y-3 p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                        <Brain size={14} className="text-zinc-500" /> Looking to Learn in Exchange
                      </h3>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {selectedSkillUser.skills_needed ? (
                          selectedSkillUser.skills_needed.split(',').map((s, idx) => (
                            <span key={idx} className="px-3 py-1 bg-white text-zinc-700 text-xs font-bold rounded-lg shadow-sm border border-zinc-200">
                              {s.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-500">Open to collaborative proposals</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 pt-2 leading-relaxed">
                        Interested in expanding horizons through mutually beneficial peer learning.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Preferred Exchange Formats</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSkillUser.exchange_methods ? (
                        selectedSkillUser.exchange_methods.split(',').map((m, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl">
                            {m.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-zinc-500">Video Call, Chat, Screen Share</span>
                      )}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="pt-6 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      onClick={async () => {
                        if (!user) return;
                        const primarySkill = selectedSkillUser.skills_offered?.split(',')[0]?.trim() || 'Skill Exchange';
                        await api.createMatch(user.id, selectedSkillUser.id, primarySkill);
                        await loadData(user.id);
                        setSelectedSkillUser(null);
                      }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Zap size={16} /> Request Skill Exchange
                    </button>

                    <button 
                      onClick={() => setSelectedSkillUser(null)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      Return to all matches
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
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
                    <p className="text-zinc-500">Click any skill or card to inspect details and connect with peers.</p>
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
                      const baseMatches = matches.length > 0 
                        ? matches 
                        : leaderboard.filter(u => u.id !== user?.id).length > 0 
                          ? leaderboard.filter(u => u.id !== user?.id) 
                          : DEMO_SKILL_USERS;

                      const filteredUsers = exchangeSearchQuery 
                        ? baseMatches.filter(u => 
                            u.skills_offered?.toLowerCase().includes(exchangeSearchQuery.toLowerCase()) ||
                            u.name?.toLowerCase().includes(exchangeSearchQuery.toLowerCase())
                          )
                        : baseMatches;

                      return filteredUsers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {filteredUsers.map(match => (
                            <MatchCard 
                              key={match.id} 
                              user={match} 
                              currentUser={user} 
                              onComplete={() => user && loadData(user.id)} 
                              onSelect={(u) => setSelectedSkillUser(u)}
                            />
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
                        <span className="text-sm font-bold">{user?.completed_matches_count || 0}</span>
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
            )
          )}

          {activeTab === 'lessons' && (
            selectedLesson ? (
              <motion.div 
                key={`lesson-detail-${selectedLesson.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {/* Navigation Back Header */}
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setSelectedLesson(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl font-bold text-sm text-zinc-700 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm group"
                  >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                    Back to Micro-Lessons
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1.5">
                      <Zap size={14} /> {selectedLesson.skill_tag}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-lg">
                      <Clock size={14} /> {selectedLesson.duration_mins} min read
                    </span>
                  </div>
                </div>

                {/* Lesson Reader Card */}
                <div className="glass rounded-3xl p-6 sm:p-10 space-y-8 bg-white border border-zinc-100 shadow-xl shadow-zinc-200/50">
                  {/* Prominent Cover Illustration */}
                  {selectedLesson.cover_image_url && (
                    <div className="w-full aspect-video max-h-80 rounded-2xl overflow-hidden border border-zinc-100 shadow-md relative bg-zinc-100 group">
                      <img 
                        src={selectedLesson.cover_image_url} 
                        alt={selectedLesson.title} 
                        className="w-full h-full object-cover" 
                      />
                      {selectedLesson.author_id === user?.id && (
                        <button 
                          type="button"
                          onClick={() => handleRegenerateReaderCover(selectedLesson)}
                          className="absolute bottom-3 right-3 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md text-white rounded-xl text-xs font-bold hover:bg-zinc-900 flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <Sparkles size={13} /> Regenerate Cover
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-3 pb-6 border-b border-zinc-100">
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-zinc-900 leading-tight">
                      {selectedLesson.title}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>Shared by: {selectedLesson.author_id === user?.id ? 'You (Creator)' : selectedLesson.author_name || selectedLesson.author_id || 'Aura Community Mentor'}</span>
                      <span>•</span>
                      <span>Actionable Micro-Module</span>
                    </div>
                  </div>

                  <div className="prose prose-indigo max-w-none text-zinc-700 leading-relaxed space-y-4">
                    <Markdown>{selectedLesson.content || 'Content for this micro-lesson is loading...'}</Markdown>
                  </div>

                  {/* Completion & Action Bar */}
                  <div className="pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      {completedLessonIds.includes(selectedLesson.id) ? (
                        <div className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                          <CheckCircle size={18} className="text-emerald-600" /> Lesson Completed (+10 Pts Earned)
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCompleteLesson(selectedLesson.id)}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-[0.98]"
                        >
                          <CheckCircle size={18} /> Mark Complete (+10 Points)
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => setSelectedLesson(null)}
                      className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
                    >
                      Return to lesson catalog
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
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
                    <p className="text-zinc-500">Fast, actionable learning in 5–10 minutes. Click Read on any lesson.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text" 
                        placeholder="Search micro-lessons..."
                        value={lessonSearchQuery}
                        onChange={(e) => setLessonSearchQuery(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-xl py-2 pl-10 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                      />
                      {lessonSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setLessonSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => setIsLessonCreateModalOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-100 whitespace-nowrap"
                    >
                      <Plus size={16} /> Create Lesson
                    </button>
                  </div>
                </header>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1">Category:</span>
                  {['All', 'Productivity', 'Design', 'Culinary', 'Tech', 'Health', 'Communication'].map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setSelectedLessonCategory(category)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                        selectedLessonCategory === category
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                  {(lessonSearchQuery || selectedLessonCategory !== 'All') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLessonSearchQuery('');
                        setSelectedLessonCategory('All');
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-auto transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const displayLessons = lessons.length > 0 ? lessons : DEMO_LESSONS;
                    const filteredLessons = displayLessons.filter(lesson => {
                      const matchCategory = selectedLessonCategory === 'All' || 
                        (lesson.skill_tag && lesson.skill_tag.toLowerCase().includes(selectedLessonCategory.toLowerCase()));
                      const matchQuery = !lessonSearchQuery ||
                        lesson.title?.toLowerCase().includes(lessonSearchQuery.toLowerCase()) ||
                        lesson.skill_tag?.toLowerCase().includes(lessonSearchQuery.toLowerCase()) ||
                        lesson.content?.toLowerCase().includes(lessonSearchQuery.toLowerCase());
                      return matchCategory && matchQuery;
                    });

                    return filteredLessons.length > 0 ? (
                      filteredLessons.map(lesson => (
                        <LessonCard 
                          key={lesson.id} 
                          lesson={lesson} 
                          currentUser={user} 
                          isCompleted={completedLessonIds.includes(lesson.id || '')}
                          onComplete={() => user && loadData(user.id)} 
                          onSelect={(l) => setSelectedLesson(l as Lesson)}
                        />
                      ))
                    ) : (
                      <div className="col-span-full p-12 glass rounded-3xl text-center space-y-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                          <BookOpen size={32} />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-zinc-800">No lessons match your search</h4>
                          <p className="text-zinc-500 text-xs">
                            {lessonSearchQuery 
                              ? `No results for "${lessonSearchQuery}" in ${selectedLessonCategory} category.`
                              : `No lessons found in ${selectedLessonCategory} category yet.`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLessonSearchQuery('');
                            setSelectedLessonCategory('All');
                          }}
                          className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )
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
                      <tr 
                        key={u.id} 
                        onClick={() => {
                          setSelectedSkillUser(u);
                          setActiveTab('exchange');
                        }}
                        className={cn(
                          "hover:bg-indigo-50/50 transition-colors cursor-pointer group", 
                          u.id === user?.id && "bg-indigo-50/30"
                        )}
                        title="Click to view peer profile and request skill exchange"
                      >
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
                            <span className="font-medium group-hover:text-indigo-600 transition-colors">{u.name}</span>
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
                          <span className="text-xs text-zinc-500 truncate max-w-[200px] block">{u.skills_offered || 'General Mentorship'}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-indigo-600">
                          <span className="flex items-center justify-end gap-1">
                            {u.points.toLocaleString()}
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-indigo-500" />
                          </span>
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
              {/* Profile Card Header with Avatar & XP Level */}
              <div className="glass rounded-3xl p-6 sm:p-8 border border-zinc-100 shadow-xl shadow-zinc-100/50 bg-white space-y-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Avatar Upload Container */}
                  <div className="relative group shrink-0">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl bg-zinc-100">
                      <UserAvatar 
                        src={user?.avatar_url} 
                        name={user?.name} 
                        className="w-full h-full object-cover" 
                        iconSize={52}
                      />
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-1">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-bold">{avatarProgress}%</span>
                        </div>
                      )}
                    </div>

                    <label className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all cursor-pointer hover:scale-105 active:scale-95" title="Upload new photo">
                      <Camera size={16} />
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp,image/gif" 
                        onChange={handleAvatarUpload}
                        disabled={avatarUploading}
                        className="hidden" 
                      />
                    </label>
                  </div>

                  {/* User Overview & XP Progress */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-zinc-900">{user?.name}</h2>
                        <p className="text-xs font-bold text-indigo-600">
                          {user?.username ? `@${user.username}` : `@${user?.email?.split('@')[0] || 'aura_user'}`}
                        </p>
                      </div>
                      <div className="flex items-center justify-center sm:justify-end gap-2">
                        {user?.avatar_url && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="px-3 py-1.5 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                          >
                            Remove Picture
                          </button>
                        )}
                        <label className="px-3 py-1.5 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1">
                          <Upload size={12} />
                          <span>Change Photo</span>
                          <input 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp,image/gif" 
                            onChange={handleAvatarUpload}
                            disabled={avatarUploading}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>

                    {user?.bio ? (
                      <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
                        "{user.bio}"
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">
                        No biography yet. Add a short bio below to introduce yourself to peers!
                      </p>
                    )}

                    {avatarStatusMsg && (
                      <div className={`p-2 rounded-xl text-xs flex items-center gap-1.5 ${
                        avatarStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {avatarStatusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <span>{avatarStatusMsg.text}</span>
                      </div>
                    )}

                    {/* Level & XP Progression Bar */}
                    <div className="pt-3 border-t border-zinc-100 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-indigo-600 flex items-center gap-1">
                          <Zap size={14} />
                          Level {Math.floor((user?.points || 0) / 100) + 1} • {
                            (user?.points || 0) >= 500 ? 'Grandmaster' :
                            (user?.points || 0) >= 250 ? 'Specialist' :
                            (user?.points || 0) >= 100 ? 'Apprentice' : 'Explorer'
                          }
                        </span>
                        <span className="text-zinc-500 font-medium">
                          {user?.points || 0} Total XP ({((user?.points || 0) % 100)} / 100 XP to next level)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, ((user?.points || 0) % 100)))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Section Navigation Tabs */}
                <div className="flex border-b border-zinc-100 pt-2 gap-2 sm:gap-4 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('details')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      profileSubTab === 'details' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <Edit3 size={14} /> Profile & Skills
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('completed')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      profileSubTab === 'completed' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <BookmarkCheck size={14} /> Completed Lessons ({completedLessonIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('achievements')}
                    className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      profileSubTab === 'achievements' 
                        ? 'border-indigo-600 text-indigo-600' 
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    <Award size={14} /> Badges & Achievements
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Editable Profile & Skills */}
              {profileSubTab === 'details' && (
                <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-zinc-100 shadow-xl shadow-zinc-100/50">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <h3 className="text-lg font-display font-bold text-zinc-900">Personalize Your Aura Identity</h3>
                      <p className="text-xs text-zinc-500">Update your details, biography, and peer exchange preferences.</p>
                    </div>
                  </div>

                  <form className="space-y-6" onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    
                    const name = formData.get('name') as string;
                    const username = (formData.get('username') as string || '').replace(/^@/, '').trim();
                    const bio = formData.get('bio') as string;
                    const skillsOffered = formData.get('skills_offered') as string;
                    const skillsNeeded = formData.get('skills_needed') as string;

                    const isNameValid = validateProfileField('name', name);
                    if (!isNameValid) return;

                    if (user) {
                      const updatedUser: User = {
                        ...user,
                        name,
                        username,
                        bio,
                        skills_offered: skillsOffered,
                        skills_needed: skillsNeeded,
                        exchange_methods: Array.from(formData.getAll('methods')).join(', ')
                      };
                      await api.saveUser(updatedUser);
                      setUser(updatedUser);
                      await loadData(user.id);
                      setAvatarStatusMsg({ type: 'success', text: 'Profile information saved successfully!' });
                    }
                  }}>
                    {/* Name & Handle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Display Name</label>
                        <div className="relative">
                          <UserIcon size={16} className={cn("absolute left-4 top-1/2 -translate-y-1/2 transition-colors", profileErrors.name ? "text-red-400" : "text-zinc-400")} />
                          <input 
                            name="name"
                            type="text" 
                            defaultValue={user?.name}
                            onChange={(e) => validateProfileField('name', e.target.value)}
                            placeholder="Your full name"
                            className={cn(
                              "w-full bg-zinc-50 border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 transition-all",
                              profileErrors.name 
                                ? "border-red-200 focus:ring-red-500/10 focus:border-red-500" 
                                : "border-zinc-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                            )}
                            required
                          />
                        </div>
                        {profileErrors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{profileErrors.name}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Username / Handle</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">@</span>
                          <input 
                            name="username"
                            type="text" 
                            defaultValue={user?.username || (user?.email ? user.email.split('@')[0] : '')}
                            placeholder="handle (e.g. alex_code)"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Biography with live char count */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Short Biography</label>
                        <span className="text-[10px] text-zinc-400">Introduce your background and passions</span>
                      </div>
                      <div className="relative">
                        <textarea 
                          name="bio"
                          defaultValue={user?.bio}
                          rows={3}
                          maxLength={300}
                          placeholder="Tell the Aura community what drives you, what projects you work on, or what you love learning..."
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Skills Offered with quick chips */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Skills You Can Teach</label>
                        <span className="text-[10px] text-zinc-400">Comma-separated or click to add</span>
                      </div>
                      <div className="relative">
                        <Edit3 size={16} className="absolute left-4 top-3.5 text-zinc-400" />
                        <input 
                          id="skills_offered_input"
                          name="skills_offered"
                          defaultValue={user?.skills_offered}
                          placeholder="e.g. Python, UI Design, Public Speaking, Photography"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      {/* Quick-add chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-zinc-400 self-center mr-1">Quick Add:</span>
                        {['Python', 'UI/UX Design', 'Public Speaking', 'Data Analysis', 'Culinary Arts', 'Time Management', 'Marketing', 'Writing'].map(skill => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('skills_offered_input') as HTMLInputElement;
                              if (el) {
                                const current = el.value.trim();
                                if (!current) {
                                  el.value = skill;
                                } else if (!current.toLowerCase().includes(skill.toLowerCase())) {
                                  el.value = `${current}, ${skill}`;
                                }
                              }
                            }}
                            className="text-[10px] font-medium bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Skills Needed with quick chips */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-400 uppercase">Skills You Want To Learn</label>
                        <span className="text-[10px] text-zinc-400">Comma-separated or click to add</span>
                      </div>
                      <div className="relative">
                        <Search size={16} className="absolute left-4 top-3.5 text-zinc-400" />
                        <input 
                          id="skills_needed_input"
                          name="skills_needed"
                          defaultValue={user?.skills_needed}
                          placeholder="e.g. Spanish, Prompt Engineering, Financial Modeling"
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      {/* Quick-add chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-zinc-400 self-center mr-1">Quick Add:</span>
                        {['React', 'Spanish', 'Prompt Engineering', 'Negotiation', 'Financial Literacy', 'Guitar', 'Productivity', 'Storytelling'].map(skill => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => {
                              const el = document.getElementById('skills_needed_input') as HTMLInputElement;
                              if (el) {
                                const current = el.value.trim();
                                if (!current) {
                                  el.value = skill;
                                } else if (!current.toLowerCase().includes(skill.toLowerCase())) {
                                  el.value = `${current}, ${skill}`;
                                }
                              }
                            }}
                            className="text-[10px] font-medium bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            + {skill}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred Exchange Methods */}
                    <div className="space-y-2 pt-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Preferred Exchange Methods</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {['Video Call', 'Chat', 'In-person', 'Email', 'Screen Share', 'Voice Call'].map(method => (
                          <label key={method} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 cursor-pointer transition-colors bg-white">
                            <input 
                              type="checkbox" 
                              name="methods" 
                              value={method} 
                              defaultChecked={user?.exchange_methods?.includes(method)}
                              className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-medium text-zinc-700">{method}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] cursor-pointer"
                      >
                        Save Profile Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub-tab 2: Completed Micro-Lessons Showcase */}
              {profileSubTab === 'completed' && (
                <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-zinc-100 shadow-xl shadow-zinc-100/50">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <h3 className="text-lg font-display font-bold text-zinc-900">Your Mastered Micro-Lessons</h3>
                      <p className="text-xs text-zinc-500">Every lesson you have completed and earned XP for.</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      {completedLessonIds.length} Lessons Finished
                    </span>
                  </div>

                  {completedLessonIds.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {completedLessonIds.map(lessonId => {
                        const lesson = lessons.find(l => l.id === lessonId) || DEMO_LESSONS.find(l => l.id === lessonId);
                        const completionInfo = completedLessonsList.find(c => c.lesson_id === lessonId);
                        
                        return (
                          <div 
                            key={lessonId}
                            className="p-5 rounded-2xl border border-zinc-200/80 bg-white hover:border-indigo-200 transition-all space-y-3 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {lesson?.skill_tag || 'Skill'}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Mastered (+10 XP)
                                </span>
                              </div>
                              <h4 className="font-bold text-zinc-900 text-sm leading-snug">
                                {lesson?.title || completionInfo?.lesson_title || 'Micro-Lesson'}
                              </h4>
                              {completionInfo?.completed_at && (
                                <p className="text-[10px] text-zinc-400">
                                  Completed on {new Date(completionInfo.completed_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (lesson) {
                                  setSelectedLesson(lesson);
                                  setActiveTab('lessons');
                                }
                              }}
                              className="w-full py-2 bg-zinc-50 hover:bg-indigo-50 text-zinc-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <BookOpen size={14} /> Review Lesson Content
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                        <BookOpen size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-zinc-800">No completed lessons yet</h4>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                        Dive into our 5-minute actionable micro-curriculum to earn points and upgrade your knowledge.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('lessons')}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        Browse Micro-Lessons <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: Achievements & Badges Showcase */}
              {profileSubTab === 'achievements' && (
                <div className="glass rounded-3xl p-6 sm:p-8 space-y-6 bg-white border border-zinc-100 shadow-xl shadow-zinc-100/50">
                  <AchievementList 
                    achievements={computeUserAchievements(user)} 
                    totalPoints={user?.points || 0} 
                  />
                </div>
              )}

              {/* Feedback Received Section */}
              <div className="glass rounded-3xl p-6 sm:p-8 space-y-4 bg-white border border-zinc-100 shadow-xl shadow-zinc-100/50">
                <h3 className="text-lg font-display font-bold flex items-center gap-2">
                  <MessageSquare size={18} className="text-zinc-400" /> Peer Feedback Received
                </h3>
                <div className="space-y-3">
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
                        <p className="text-xs text-zinc-600 italic">"{fb.comment}"</p>
                        <p className="text-[10px] text-zinc-400 text-right">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 space-y-1">
                      <MessageSquare size={24} className="mx-auto text-zinc-300" />
                      <p className="text-xs text-zinc-400">No peer reviews yet. Complete exchanges to earn ratings!</p>
                    </div>
                  )}
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
                    {['All', 'Account', 'Notifications', 'Privacy', 'Billing'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSettingsSubTab(item.toLowerCase() as any)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center justify-between",
                          (item === 'All' && settingsSubTab === 'all') || settingsSubTab === item.toLowerCase()
                            ? "bg-indigo-50 text-indigo-600 font-bold shadow-xs" 
                            : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                        )}
                      >
                        <span>{item === 'All' ? 'All Settings' : item}</span>
                        {((item === 'All' && settingsSubTab === 'all') || settingsSubTab === item.toLowerCase()) && (
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                        )}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="md:col-span-2 space-y-8">
                  {/* Account Section */}
                  {(settingsSubTab === 'all' || settingsSubTab === 'account') && (
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
                              readOnly
                              value={user?.email || ''}
                              className="w-full bg-zinc-100/70 text-zinc-600 border border-zinc-200 rounded-xl py-3 px-4 text-sm cursor-not-allowed"
                            />
                            <p className="text-[10px] text-zinc-400">Primary authentication identifier</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-400 uppercase">Preferred Language</label>
                            <select 
                              value={preferredLanguage}
                              onChange={(e) => setPreferredLanguage(e.target.value)}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                            >
                              <option value="English (US)">English (US)</option>
                              <option value="Spanish">Spanish (Español)</option>
                              <option value="French">French (Français)</option>
                              <option value="German">German (Deutsch)</option>
                              <option value="Japanese">Japanese (日本語)</option>
                              <option value="Mandarin">Mandarin (中文)</option>
                            </select>
                            <p className="text-[10px] text-zinc-400">Controls coach and micro-curriculum language</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          {accountSaveStatus ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                              <CheckCircle2 size={14} /> {accountSaveStatus}
                            </span>
                          ) : <div />}
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                localStorage.setItem('aura_preferred_lang', preferredLanguage);
                                setAccountSaveStatus('Language preferences saved!');
                                setTimeout(() => setAccountSaveStatus(null), 3500);
                              } catch (_) {}
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                          >
                            Save Preferences
                          </button>
                        </div>

                        <div className="pt-4 border-t border-zinc-100">
                          <PasswordSettings />
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Notifications Section */}
                  {(settingsSubTab === 'all' || settingsSubTab === 'notifications') && (
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
                  )}

                  {/* Privacy Section */}
                  {(settingsSubTab === 'all' || settingsSubTab === 'privacy') && (
                    <section className="glass rounded-3xl p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Shield size={20} className="text-zinc-400" /> Privacy & Security
                        </h3>
                        {privacySaveMsg && (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={13} /> {privacySaveMsg}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <SettingsToggle 
                          label="Public Profile" 
                          description="Allow other users to find you in the Global Exchange."
                          icon={<Globe size={18} />}
                          checked={privacySettings.publicProfile}
                          onChange={(val) => {
                            const next = { ...privacySettings, publicProfile: val };
                            setPrivacySettings(next);
                            try {
                              localStorage.setItem('aura_privacy_settings', JSON.stringify(next));
                            } catch (_) {}
                            setPrivacySaveMsg('Profile visibility updated.');
                            setTimeout(() => setPrivacySaveMsg(null), 3000);
                          }}
                        />
                        <SettingsToggle 
                          label="Show Points" 
                          description="Display your total Aura points on the leaderboard."
                          icon={<Trophy size={18} />}
                          checked={privacySettings.showPoints}
                          onChange={(val) => {
                            const next = { ...privacySettings, showPoints: val };
                            setPrivacySettings(next);
                            try {
                              localStorage.setItem('aura_privacy_settings', JSON.stringify(next));
                            } catch (_) {}
                            setPrivacySaveMsg('Leaderboard score privacy updated.');
                            setTimeout(() => setPrivacySaveMsg(null), 3000);
                          }}
                        />
                        <SettingsToggle 
                          label="Two-Factor Authentication" 
                          description="Add an extra layer of security to your account."
                          icon={<Lock size={18} />}
                          checked={privacySettings.twoFactor}
                          onChange={(val) => {
                            const next = { ...privacySettings, twoFactor: val };
                            setPrivacySettings(next);
                            try {
                              localStorage.setItem('aura_privacy_settings', JSON.stringify(next));
                            } catch (_) {}
                            setPrivacySaveMsg(val ? '2FA protection enabled.' : '2FA protection disabled.');
                            setTimeout(() => setPrivacySaveMsg(null), 3000);
                          }}
                        />
                      </div>
                    </section>
                  )}

                  {/* Billing Section */}
                  {(settingsSubTab === 'all' || settingsSubTab === 'billing') && (
                    <section className="glass rounded-3xl p-8 space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <CreditCard size={20} className="text-zinc-400" /> Subscription & Billing
                      </h3>
                      <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl text-white space-y-4 shadow-lg shadow-indigo-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Current Plan</p>
                            <h4 className="text-2xl font-display font-bold">Aura Pro</h4>
                          </div>
                          <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">Active</span>
                        </div>
                        <p className="text-sm text-indigo-50">Your next billing date is April 6, 2026 ($12.00/mo).</p>
                        <button 
                          type="button"
                          onClick={() => setShowBillingModal(true)}
                          className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                        >
                          Manage Subscription
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Sign Out Section */}
                  <section className="glass rounded-3xl p-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left space-y-1">
                      <h3 className="text-lg font-bold">Sign Out</h3>
                      <p className="text-sm text-zinc-500">Log out of your Aura account on this device.</p>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-95 cursor-pointer"
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

        {/* Subscription & Billing Management Modal */}
        <SubscriptionModal 
          isOpen={showBillingModal}
          onClose={() => setShowBillingModal(false)}
          userEmail={user?.email}
          userName={user?.name}
        />
      </main>

      {/* Footer / Mobile Nav */}
      <footer className="md:hidden sticky bottom-0 z-50 glass border-t border-zinc-200 px-6 py-3 flex justify-around">
        <MobileNavButton active={activeTab === 'coach'} onClick={() => navigateToTab('coach')} icon={<Brain size={20} />} />
        <MobileNavButton active={activeTab === 'exchange'} onClick={() => navigateToTab('exchange')} icon={<Globe size={20} />} />
        <MobileNavButton active={activeTab === 'lessons'} onClick={() => navigateToTab('lessons')} icon={<BookOpen size={20} />} />
        <MobileNavButton active={activeTab === 'leaderboard'} onClick={() => navigateToTab('leaderboard')} icon={<Trophy size={20} />} />
        <MobileNavButton active={activeTab === 'about'} onClick={() => navigateToTab('about')} icon={<Info size={20} />} />
        <MobileNavButton active={activeTab === 'settings'} onClick={() => navigateToTab('settings')} icon={<Settings size={20} />} />
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-bold text-zinc-900">Create Micro-Lesson</h3>
                  <p className="text-zinc-500 text-xs">Contribute to the Aura community by sharing an actionable 5-10 minute lesson with cover illustration.</p>
                </div>

                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const title = formData.get('title') as string;
                  const skillTag = formData.get('skill_tag') as string;
                  const duration = parseInt(formData.get('duration') as string) || 5;
                  const content = formData.get('content') as string;

                  if (user) {
                    let coverUrl = newLessonCoverUrl;
                    let coverSource = newLessonCoverSource;

                    // Automatically generate cover if user didn't manually generate one
                    if (!coverUrl) {
                      try {
                        const generated = await api.generateAndSaveLessonCover(title, skillTag, content);
                        coverUrl = generated.coverUrl;
                        coverSource = generated.source;
                      } catch (err) {
                        console.warn("Cover auto-generation fallback:", err);
                      }
                    }

                    const newLesson: Lesson = {
                      id: `lesson-${Date.now()}`,
                      title,
                      skill_tag: skillTag,
                      duration_mins: duration,
                      content,
                      author_id: user.id,
                      author_name: user.name,
                      cover_image_url: coverUrl,
                      cover_image_source: coverSource,
                      created_at: new Date().toISOString()
                    };

                    await api.saveLesson(newLesson);
                    
                    // Celebrate lesson creation
                    try {
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                    } catch (_) {}

                    setCelebration({
                      title: 'Lesson Published! +20 XP',
                      subtitle: `"${title}" is now live for all learners!`,
                      points: 20
                    });
                    setTimeout(() => setCelebration(null), 4000);

                    setIsLessonCreateModalOpen(false);
                    setNewLessonCoverUrl('');
                    loadData(user.id);
                  }
                }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Lesson Title</label>
                      <input 
                        id="new_lesson_title"
                        name="title"
                        type="text" 
                        placeholder="e.g. 5 Tips for Better Focus"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Skill Category</label>
                      <input 
                        id="new_lesson_tag"
                        name="skill_tag"
                        type="text" 
                        placeholder="e.g. Productivity, Culinary, Design"
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* AI Cover Art Generation & Upload Component */}
                  <LessonCoverUpload 
                    title={newLessonCoverUrl ? "Selected Cover" : "Lesson Cover Preview"}
                    category="Skill"
                    initialCoverUrl={newLessonCoverUrl}
                    onCoverChange={(url, source) => {
                      setNewLessonCoverUrl(url);
                      setNewLessonCoverSource(source);
                    }}
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Duration (minutes)</label>
                    <input 
                      name="duration"
                      type="number" 
                      min="1"
                      max="60"
                      defaultValue="5"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Lesson Content (Markdown supported)</label>
                    <textarea 
                      name="content"
                      placeholder="Share your structured, actionable knowledge here... (Markdown formatted with headers, lists, and tips)"
                      rows={5}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                      required
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsLessonCreateModalOpen(false)}
                      className="flex-1 py-3 border border-zinc-200 rounded-xl text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 cursor-pointer"
                    >
                      Publish Lesson & Save Cover
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

      {/* Floating XP Celebration Toast Banner */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-[110] bg-zinc-950 text-white p-4 rounded-2xl shadow-2xl border border-zinc-800 flex items-center gap-3.5 max-w-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              +{celebration.points}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                {celebration.title}
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">{celebration.subtitle}</p>
            </div>
            <button 
              onClick={() => setCelebration(null)} 
              className="text-zinc-500 hover:text-white ml-auto p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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

function MatchCard({ 
  user, 
  currentUser, 
  onComplete,
  onSelect 
}: { 
  user: User, 
  currentUser: User | null, 
  onComplete?: () => void,
  onSelect?: (user: User) => void 
}) {
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
    <div 
      onClick={() => onSelect && onSelect(user)}
      className="glass rounded-2xl p-5 card-hover border-zinc-100 flex flex-col justify-between cursor-pointer group hover:border-indigo-200 transition-all"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 overflow-hidden shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm group-hover:text-indigo-600 transition-colors">{user.name}</h4>
              <p className="text-xs text-zinc-400">Verified Expert • {user.points || 0} pts</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
            <Zap size={12} /> Match
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-zinc-400 uppercase">Offers</p>
          <p className="text-sm font-semibold text-zinc-800 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {user.skills_offered || "General Mentorship"}
          </p>
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

        <div className="pt-1 flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-all">
          <span>View Skill & Connect</span>
          <ChevronRight size={14} />
        </div>
      </div>
      
      <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
        {isRequested ? (
          <div className="space-y-2">
            <div className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center gap-2">
              <Sparkles size={14} /> Request Sent
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowFeedbackModal(true);
              }}
              className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Complete & Feedback
            </button>
          </div>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRequest();
            }}
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

function LessonCard({ 
  lesson, 
  currentUser, 
  isCompleted,
  onComplete,
  onSelect 
}: { 
  lesson: Partial<Lesson>, 
  currentUser: User | null, 
  isCompleted?: boolean,
  onComplete: () => void,
  onSelect?: (lesson: Partial<Lesson>) => void 
}) {
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
    <div 
      onClick={() => onSelect && onSelect(lesson)}
      className="glass rounded-2xl overflow-hidden card-hover border-zinc-100 flex flex-col relative group cursor-pointer hover:border-indigo-200 transition-all"
    >
      {isAuthor && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
          className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm text-zinc-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
          title="Delete Lesson"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="h-44 bg-zinc-100 relative overflow-hidden group-hover:brightness-95 transition-all">
        {lesson.cover_image_url ? (
          <img 
            src={lesson.cover_image_url} 
            alt={lesson.title || "Lesson"} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-600/20 flex items-center justify-center text-indigo-300">
            <BookOpen size={48} className="group-hover:scale-105 transition-transform text-indigo-400/80" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-md shadow-xs">
            {lesson.skill_tag}
          </span>
        </div>
      </div>
      <div className="p-5 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400 font-medium">
            {lesson.author_name || (isAuthor ? 'You' : 'Community Mentor')}
          </span>
          <span className="text-xs text-zinc-400 flex items-center gap-1 font-semibold">
            <Clock size={12} /> {lesson.duration_mins} min
          </span>
        </div>
        <h4 className="font-bold text-zinc-900 leading-tight flex-1 group-hover:text-indigo-600 transition-colors">{lesson.title}</h4>
        <div className="flex items-center justify-between pt-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect && onSelect(lesson);
            }}
            className="flex items-center gap-1 text-xs font-bold text-zinc-900 hover:text-indigo-600 transition-colors group/btn cursor-pointer py-1"
          >
            Read <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform text-indigo-600" />
          </button>
          
          {isCompleted ? (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1">
              <CheckCircle size={12} /> Completed
            </span>
          ) : (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleComplete();
              }}
              disabled={isCompleting}
              className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isCompleting ? "..." : "Mark Complete"}
            </button>
          )}
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

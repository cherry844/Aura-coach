export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  xp_reward: number;
  category: 'learning' | 'mentorship' | 'community' | 'mastery';
  isUnlocked: boolean;
  progress?: {
    current: number;
    total: number;
  };
}

export interface Feedback {
  id: string;
  match_id: string;
  from_user_id: string;
  from_user_name?: string;
  from_user_avatar?: string;
  to_user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  email: string;
  points: number;
  skills_offered: string; // Comma separated
  skills_needed: string; // Comma separated
  exchange_methods: string; // Comma separated
  avatar_url?: string;
  achievements?: Achievement[];
  feedback?: Feedback[];
  completed_lessons_count: number;
  completed_matches_count: number;
  created_at?: string;
  updated_at?: any;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name?: string;
  skill_tag: string;
  duration_mins: number;
  created_at: string;
  cover_image_url?: string;
  cover_image_source?: 'ai' | 'upload' | 'fallback';
}

export interface LessonCompletion {
  user_id: string;
  lesson_id: string;
  completed_at: string;
  lesson_title?: string;
  skill_tag?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  groundingSources?: {
    title: string;
    uri: string;
  }[];
  isVoice?: boolean;
}

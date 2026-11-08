export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
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
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  author_id: string;
  skill_tag: string;
  duration_mins: number;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

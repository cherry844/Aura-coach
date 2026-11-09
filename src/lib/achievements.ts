import { User, Achievement } from '../types';

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'isUnlocked' | 'unlocked_at'>[] = [
  {
    id: 'first-lesson',
    name: 'First Step',
    description: 'Complete your first micro-lesson on Aura.',
    icon: '🌱',
    xp_reward: 10,
    category: 'learning',
  },
  {
    id: 'knowledge-seeker',
    name: 'Knowledge Seeker',
    description: 'Complete 5 micro-lessons across any skill domain.',
    icon: '📚',
    xp_reward: 25,
    category: 'learning',
  },
  {
    id: 'master-learner',
    name: 'Master Learner',
    description: 'Complete 10 micro-lessons and expand your horizons.',
    icon: '🎓',
    xp_reward: 50,
    category: 'learning',
  },
  {
    id: 'skill-pioneer',
    name: 'Skill Pioneer',
    description: 'Offer at least one skill you can teach to the community.',
    icon: '💡',
    xp_reward: 20,
    category: 'mentorship',
  },
  {
    id: 'global-mentor',
    name: 'Global Mentor',
    description: 'Complete your first collaborative peer skill exchange.',
    icon: '🤝',
    xp_reward: 50,
    category: 'mentorship',
  },
  {
    id: 'identity-established',
    name: 'Identity Established',
    description: 'Personalize your profile with an avatar, bio, and handle.',
    icon: '✨',
    xp_reward: 15,
    category: 'community',
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Reach 100 total Aura XP points through active learning.',
    icon: '⚡',
    xp_reward: 30,
    category: 'mastery',
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    description: 'Accumulate 500+ XP points and become a top community leader.',
    icon: '👑',
    xp_reward: 100,
    category: 'mastery',
  }
];

export function computeUserAchievements(user: User | null): Achievement[] {
  if (!user) {
    return ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      isUnlocked: false
    }));
  }

  const completedLessons = user.completed_lessons_count || 0;
  const completedMatches = user.completed_matches_count || 0;
  const points = user.points || 0;
  const hasOfferedSkills = Boolean(user.skills_offered && user.skills_offered.trim().length > 0);
  const hasPersonalized = Boolean(user.avatar_url && (user.bio || user.username));

  return ALL_ACHIEVEMENTS.map(a => {
    let isUnlocked = false;
    let progress: { current: number; total: number } | undefined;

    switch (a.id) {
      case 'first-lesson':
        isUnlocked = completedLessons >= 1;
        progress = { current: Math.min(completedLessons, 1), total: 1 };
        break;
      case 'knowledge-seeker':
        isUnlocked = completedLessons >= 5;
        progress = { current: Math.min(completedLessons, 5), total: 5 };
        break;
      case 'master-learner':
        isUnlocked = completedLessons >= 10;
        progress = { current: Math.min(completedLessons, 10), total: 10 };
        break;
      case 'skill-pioneer':
        isUnlocked = hasOfferedSkills;
        progress = { current: hasOfferedSkills ? 1 : 0, total: 1 };
        break;
      case 'global-mentor':
        isUnlocked = completedMatches >= 1;
        progress = { current: Math.min(completedMatches, 1), total: 1 };
        break;
      case 'identity-established':
        isUnlocked = hasPersonalized;
        progress = { current: hasPersonalized ? 1 : 0, total: 1 };
        break;
      case 'centurion':
        isUnlocked = points >= 100;
        progress = { current: Math.min(points, 100), total: 100 };
        break;
      case 'grandmaster':
        isUnlocked = points >= 500;
        progress = { current: Math.min(points, 500), total: 500 };
        break;
      default:
        isUnlocked = false;
    }

    return {
      ...a,
      isUnlocked,
      progress
    };
  });
}

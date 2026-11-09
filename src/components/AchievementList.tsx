import React from 'react';
import { Achievement } from '../types';
import { Trophy, CheckCircle, Lock, Sparkles } from 'lucide-react';

interface AchievementListProps {
  achievements: Achievement[];
  totalPoints: number;
}

export function AchievementList({ achievements, totalPoints }: AchievementListProps) {
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;

  return (
    <div className="space-y-6">
      {/* Overview stats header */}
      <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-indigo-100 flex items-center justify-center text-xl">
            🏆
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-900">Community Badges</h4>
            <p className="text-xs text-zinc-500">
              Unlocked {unlockedCount} of {achievements.length} badges • {totalPoints} Total XP
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-2xs">
            {Math.round((unlockedCount / achievements.length) * 100)}% Complete
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
              achievement.isUnlocked
                ? 'bg-white border-zinc-200/80 shadow-xs hover:border-indigo-200 hover:shadow-sm'
                : 'bg-zinc-50/70 border-zinc-200/50 opacity-75'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform ${
                  achievement.isUnlocked
                    ? 'bg-indigo-50 border border-indigo-100 shadow-2xs'
                    : 'bg-zinc-100 border border-zinc-200 text-zinc-400 grayscale'
                }`}
              >
                {achievement.icon}
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h5 className="text-xs font-bold text-zinc-900 truncate">{achievement.name}</h5>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      achievement.isUnlocked
                        ? 'bg-indigo-100 text-indigo-700 font-extrabold'
                        : 'bg-zinc-200/80 text-zinc-600'
                    }`}
                  >
                    +{achievement.xp_reward} XP
                  </span>
                </div>

                <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">
                  {achievement.description}
                </p>
              </div>
            </div>

            {/* Progress / Status Bar */}
            <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[10px]">
              {achievement.isUnlocked ? (
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <CheckCircle size={12} />
                  <span>Unlocked</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-zinc-400 font-medium">
                  <Lock size={12} />
                  {achievement.progress ? (
                    <span>
                      Progress: {achievement.progress.current} / {achievement.progress.total}
                    </span>
                  ) : (
                    <span>Locked</span>
                  )}
                </div>
              )}

              {achievement.progress && !achievement.isUnlocked && (
                <div className="w-20 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{
                      width: `${(achievement.progress.current / achievement.progress.total) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

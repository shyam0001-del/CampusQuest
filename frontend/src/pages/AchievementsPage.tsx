import React, { useState, useEffect } from 'react';
import {
  Award,
  Zap,
  Flame,
  Coins,
  Trophy,
  CheckCircle2,
  Lock,
  Sparkles,
  Rocket,
  Crown,
  BookCheck,
  FlaskConical,
  Presentation,
} from 'lucide-react';
import { Achievement } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const AchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        achievements: Achievement[];
        completionPercentage: number;
      }>('/achievements');

      if (res.success) {
        setAchievements(res.achievements);
        setCompletionPercentage(res.completionPercentage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Rocket':
        return Rocket;
      case 'Zap':
        return Zap;
      case 'Trophy':
        return Trophy;
      case 'Flame':
        return Flame;
      case 'Crown':
        return Crown;
      case 'BookCheck':
        return BookCheck;
      case 'FlaskConical':
        return FlaskConical;
      case 'Presentation':
        return Presentation;
      case 'Coins':
        return Coins;
      default:
        return Award;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Hero Level Progression Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-200 p-[2px] shadow-glow-gold shrink-0">
              <div className="w-full h-full bg-[#0d121f] rounded-[22px] flex items-center justify-center font-black text-amber-400 text-2xl sm:text-3xl">
                {user?.level || 1}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
                Cadet Advancement Tier
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
                Level {user?.level || 1} Scholar
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Accumulated <strong>{user?.xp || 0} Total XP</strong> and <strong>{user?.coins || 0} Gold Coins</strong>
              </p>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Quest Badges Unlocked</span>
              <span className="text-amber-400 font-bold">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500 shadow-glow-violet"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Achievement Hall of Fame</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : achievements.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-[#111726]/60 border border-white/10 p-8 space-y-3">
            <Award className="w-12 h-12 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">No academic achievements yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Submit assignments on-time, claim early bird podium bonuses, and keep daily streaks active to unlock achievements!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((ach) => {
              const IconComponent = getIcon(ach.icon);
              const isUnlocked = ach.isUnlocked;

              return (
                <div
                  key={ach._id}
                  className={`p-5 rounded-3xl border transition-all duration-300 flex items-start gap-4 ${
                    isUnlocked
                      ? 'bg-[#111726] border-violet-500/30 hover:border-violet-500/60 shadow-lg'
                      : 'bg-slate-900/40 border-white/5 opacity-60'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-glow-violet'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isUnlocked ? <IconComponent className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isUnlocked ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {ach.title}
                      </h4>
                      {isUnlocked && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Unlocked
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ach.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-[11px] font-semibold">
                      <span className="text-violet-400">+{ach.xpReward} XP</span>
                      <span className="text-amber-400 flex items-center gap-1">
                        <Coins className="w-3 h-3 fill-amber-400" />
                        +{ach.coinReward} Coins
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

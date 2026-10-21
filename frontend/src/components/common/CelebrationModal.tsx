import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Coins, Flame, CheckCircle, ArrowRight, X } from 'lucide-react';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  rewardResult: {
    baseCoins: number;
    bonusCoins: number;
    totalCoins: number;
    bonusRank: 1 | 2 | 3 | null;
    isLate: boolean;
    currentStreak?: number;
    newLevel?: number;
    isResubmission?: boolean;
  };
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  rewardResult,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Fire celebratory confetti!
      const count = 200;
      const defaults = {
        origin: { y: 0.65 },
        zIndex: 9999,
      };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#8b5cf6', '#06b6d4', '#f59e0b'],
      });
      fire(0.2, {
        spread: 60,
        colors: ['#ffd700', '#f43f5e', '#10b981'],
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rankBadges = {
    1: { label: '🥇 1st Place Podium Bonus!', color: 'text-amber-300', bg: 'bg-amber-500/20 border-amber-500/40' },
    2: { label: '🥈 2nd Place Podium Bonus!', color: 'text-slate-200', bg: 'bg-slate-300/20 border-slate-300/40' },
    3: { label: '🥉 3rd Place Podium Bonus!', color: 'text-amber-500', bg: 'bg-amber-700/20 border-amber-600/40' },
  };

  const currentRankBadge = rewardResult.bonusRank ? rankBadges[rewardResult.bonusRank] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#131b2e] to-[#0c101d] border border-violet-500/30 p-6 sm:p-8 shadow-2xl z-10 text-center animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Luminous Trophy Graphic */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-[2px] shadow-glow-gold mb-5 animate-bounce">
          <div className="w-full h-full bg-[#0d121f] rounded-[22px] flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          Quest Complete! 🎉
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto line-clamp-1">
          {taskTitle}
        </p>

        {/* Bonus Rank Banner if won */}
        {currentRankBadge && (
          <div
            className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold ${currentRankBadge.bg} ${currentRankBadge.color} shadow-sm animate-pulse-slow`}
          >
            {currentRankBadge.label}
          </div>
        )}

        {/* Reward Receipt Card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Base Completion Reward:</span>
            <span className="font-semibold text-slate-200">+{rewardResult.baseCoins} coins</span>
          </div>

          {rewardResult.bonusCoins > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
              <span>Early Bird Podium Bonus:</span>
              <span>+{rewardResult.bonusCoins} coins</span>
            </div>
          )}

          {rewardResult.isLate && (
            <div className="flex items-center justify-between text-xs text-rose-400">
              <span>Late Submission Adjustment:</span>
              <span>Applied</span>
            </div>
          )}

          <div className="h-px bg-white/10 my-1" />

          <div className="flex items-center justify-between text-sm font-extrabold text-white">
            <span>Total Coins Credited:</span>
            <span className="flex items-center gap-1.5 text-amber-400 text-base">
              <Coins className="w-4 h-4 fill-amber-400" />
              +{rewardResult.totalCoins}
            </span>
          </div>
        </div>

        {/* Streak & Level updates */}
        {rewardResult.currentStreak && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-rose-400">
            <Flame className="w-4 h-4 fill-rose-500" />
            <span>{rewardResult.currentStreak}-Day Submission Streak Active!</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2"
        >
          <span>Claim Rewards & Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

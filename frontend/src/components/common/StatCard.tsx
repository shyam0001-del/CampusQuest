import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  gradient?: 'violet' | 'cyan' | 'gold' | 'coral' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  subtext,
  gradient = 'violet',
}) => {
  const gradients = {
    violet: {
      bg: 'from-violet-500/10 to-purple-500/5',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      iconBg: 'bg-violet-500/20 text-violet-400',
      glow: 'group-hover:shadow-glow-violet',
    },
    cyan: {
      bg: 'from-cyan-500/10 to-blue-500/5',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      glow: 'group-hover:shadow-glow-cyan',
    },
    gold: {
      bg: 'from-amber-500/10 to-yellow-500/5',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/20 text-amber-400',
      glow: 'group-hover:shadow-glow-gold',
    },
    coral: {
      bg: 'from-rose-500/10 to-pink-500/5',
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/20 text-rose-400',
      glow: 'group-hover:shadow-glow-coral',
    },
    emerald: {
      bg: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      glow: 'group-hover:shadow-emerald',
    },
  };

  const style = gradients[gradient];

  return (
    <div
      className={`group relative p-5 rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} transition-all duration-300 hover:-translate-y-1 ${style.glow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">{value}</p>
          {subtext && <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-2xl ${style.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

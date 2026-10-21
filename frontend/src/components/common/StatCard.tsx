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
  const iconAccents = {
    violet: 'bg-violet-500/15 text-violet-400',
    cyan: 'bg-cyan-500/15 text-cyan-400',
    gold: 'bg-amber-500/15 text-amber-400',
    coral: 'bg-rose-500/15 text-rose-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  };

  const iconStyle = iconAccents[gradient] || iconAccents.violet;

  return (
    <div
      className="group relative p-3.5 sm:p-5 rounded-2xl bg-[#111726] border border-white/10 transition-all duration-300 hover:-translate-y-1 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wide uppercase truncate">{label}</p>
          <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-0.5 sm:mt-1 tracking-tight truncate">{value}</p>
          {subtext && <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 sm:mt-1 font-medium truncate">{subtext}</p>}
        </div>
        <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${iconStyle} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
        </div>
      </div>
    </div>
  );
};

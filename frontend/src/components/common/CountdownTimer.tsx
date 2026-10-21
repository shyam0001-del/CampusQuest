import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatTimeRemaining } from '../../lib/utils';

interface CountdownTimerProps {
  deadline: string;
  isSubmitted?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ deadline, isSubmitted }) => {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(formatTimeRemaining(deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (isSubmitted) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Submitted
      </span>
    );
  }

  if (timeLeft.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        <AlertTriangle className="w-3.5 h-3.5" />
        Overdue
      </span>
    );
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
        isUrgent
          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-glow-gold'
          : 'bg-slate-800/80 text-slate-300 border-white/10'
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
      <span>{timeLeft.formatted}</span>
    </span>
  );
};

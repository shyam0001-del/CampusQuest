import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRemaining(deadlineStr: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formatted: string;
} {
  const deadline = new Date(deadlineStr).getTime();
  const now = new Date().getTime();
  const diff = deadline - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isOverdue: true,
      formatted: 'Overdue',
    };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let formatted = '';
  if (days > 0) formatted = `${days}d ${hours}h left`;
  else if (hours > 0) formatted = `${hours}h ${minutes}m left`;
  else formatted = `${minutes}m ${seconds}s left`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isOverdue: false,
    formatted,
  };
}

export function getCategoryBadge(category: string): { label: string; bg: string; text: string; border: string } {
  switch (category) {
    case 'assignment':
      return { label: 'Assignment', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30' };
    case 'lab_activity':
      return { label: 'Lab Activity', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'presentation':
      return { label: 'Presentation', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'practical_record':
      return { label: 'Practical Record', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'project':
      return { label: 'Project', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' };
    default:
      return { label: 'Academic Task', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' };
  }
}

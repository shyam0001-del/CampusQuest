import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Target,
  ChevronLeft,
  ChevronRight,
  Flame,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { getCategoryBadge } from '../lib/utils';
import { Link } from 'react-router-dom';

export const CalendarPage: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Target customization
  const [targetTasks, setTargetTasks] = useState(user?.targetWeeklyTasks || 5);
  const [targetCoins, setTargetCoins] = useState(user?.targetCoinGoal || 500);
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetSaveSuccess, setTargetSaveSuccess] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks');
      if (res.success) {
        setTasks(res.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTargets(true);
    try {
      const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
        targetWeeklyTasks: targetTasks,
        targetCoinGoal: targetCoins,
      });
      if (res.success) {
        updateUser({ targetWeeklyTasks: targetTasks, targetCoinGoal: targetCoins });
        setTargetSaveSuccess(true);
        setTimeout(() => setTargetSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTargets(false);
    }
  };

  // Calendar logic for current month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group tasks by day in month
  const tasksByDay: Record<number, Task[]> = {};
  tasks.forEach((t) => {
    const d = new Date(t.deadline);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dayNum = d.getDate();
      if (!tasksByDay[dayNum]) tasksByDay[dayNum] = [];
      tasksByDay[dayNum].push(t);
    }
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <CalendarIcon className="w-6 h-6 text-violet-400" />
          <span>Academic Planner & Target System</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Track monthly deadlines, manage completion pace, and calibrate personal weekly productivity goals.
        </p>
      </div>

      {/* Target Setting & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Target Config Card */}
        <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Calibrate Personal Targets</h3>
          </div>

          <form onSubmit={handleSaveTargets} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Target Weekly Submissions
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetTasks}
                onChange={(e) => setTargetTasks(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Semester Coin Goal
              </label>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={targetCoins}
                onChange={(e) => setTargetCoins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-amber-300 font-bold focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingTargets}
              className="w-full py-2 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-50"
            >
              {savingTargets ? 'Saving...' : 'Update Targets'}
            </button>

            {targetSaveSuccess && (
              <p className="text-[11px] text-emerald-400 text-center font-semibold">
                ✓ Targets updated successfully!
              </p>
            )}
          </form>
        </div>

        {/* Current Pace Overview */}
        <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500 fill-rose-500" />
              <h3 className="font-bold text-sm text-white">Streak & Consistency</h3>
            </div>
            <p className="text-3xl font-extrabold text-white">{user?.streak || 0} Days</p>
            <p className="text-xs text-slate-400">
              Submit at least one academic task each day to keep your active multiplier going.
            </p>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Next milestone:</span>
            <span className="font-bold text-violet-300">7-Day Momentum Badge</span>
          </div>
        </div>

        {/* Savings Balance */}
        <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">Coin Reserve</h3>
            </div>
            <p className="text-3xl font-extrabold text-amber-400">{user?.coins || 0} Coins</p>
            <p className="text-xs text-slate-400">
              Target goal progress: {Math.min(100, Math.round(((user?.coins || 0) / targetCoins) * 100))}% reached.
            </p>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(((user?.coins || 0) / targetCoins) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Monthly Calendar View */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells before 1st of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] rounded-2xl bg-slate-950/20 border border-transparent" />
          ))}

          {/* Days of current month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayTasks = tasksByDay[dayNum] || [];
            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={dayNum}
                className={`min-h-[80px] sm:min-h-[100px] p-2 rounded-2xl border transition flex flex-col justify-between ${
                  isToday
                    ? 'bg-violet-950/30 border-violet-500/50 shadow-glow-violet'
                    : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-violet-400' : 'text-slate-400'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>

                {/* Tasks inside day cell */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => (
                    <Link
                      key={t._id}
                      to={`/tasks/${t._id}`}
                      className="block truncate text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-200 hover:bg-violet-600 transition"
                    >
                      {t.title}
                    </Link>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-slate-400 block">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

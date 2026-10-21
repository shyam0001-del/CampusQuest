import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Coins,
  Trophy,
  Flame,
  ArrowRight,
  Plus,
  BookOpen,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { getCategoryBadge } from '../lib/utils';
import { CreateTaskModal } from '../components/common/CreateTaskModal';
import { CreateSubjectModal } from '../components/common/CreateSubjectModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get<{ success: boolean; stats: any; upcomingDeadlines: any[]; subjectProgress: any[]; activityData: any[]; recentActivity: any[]; targets: any }>(
        '/analytics/dashboard'
      );
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {};
  const upcomingDeadlines = data?.upcomingDeadlines || [];
  const subjectProgress = data?.subjectProgress || [];
  const activityData = data?.activityData || [];
  const recentActivity = data?.recentActivity || [];
  const targets = data?.targets || {
    weeklyTasks: { target: 5, completed: 0, percentage: 0 },
    coinGoal: { target: 500, current: 0, percentage: 0 },
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/80 via-slate-900 to-[#111726] border border-violet-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-violet-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ring-2 ring-violet-500/40 shadow-glow-violet object-cover bg-violet-950"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {user?.role === 'admin' ? 'Faculty Admin' : `Rank #${stats.rank || user?.rank || 1} • Level ${user?.level || 1}`}
                </span>
                {user?.role === 'student' && (
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                    {user?.streak || 0}d streak
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5 tracking-tight">
                Welcome back, {user?.name || 'Student'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {user?.role === 'admin'
                  ? 'Monitor class submissions, publish academic tasks, and configure reward policies.'
                  : 'Turn in coursework before deadlines to claim first-place podium coins & level up.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {user?.role === 'admin' ? (
              <>
                <button
                  onClick={() => setIsCreateSubjectOpen(true)}
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span>+ Subject</span>
                </button>
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Publish Task</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/tasks"
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Pending Tasks</span>
                </Link>
                <Link
                  to="/leaderboard"
                  className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Leaderboard</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Tasks"
          value={stats.totalTasks || 0}
          icon={CheckSquare}
          subtext="Published this semester"
          gradient="violet"
        />
        <StatCard
          label={user?.role === 'admin' ? 'Total Submissions' : 'Completed'}
          value={stats.completedSubmissions || 0}
          icon={Sparkles}
          subtext={user?.role === 'admin' ? 'Across all subjects' : 'Verified turn-ins'}
          gradient="emerald"
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pendingTasks || 0}
          icon={Clock}
          subtext="Due before deadlines"
          gradient="cyan"
        />
        <StatCard
          label={user?.role === 'admin' ? 'Total Students' : 'Coins Earned'}
          value={user?.role === 'admin' ? stats.totalStudents || 0 : stats.coinsEarned || user?.coins || 0}
          icon={user?.role === 'admin' ? BookOpen : Coins}
          subtext={user?.role === 'admin' ? 'Enrolled in curriculum' : `Current Rank #${stats.rank || 1}`}
          gradient="gold"
        />
      </div>

      {/* 3. Targets & Weekly Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Weekly Activity Rhythm</h3>
              <p className="text-xs text-slate-400">Submissions completed per day</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 rounded-full bg-violet-500 inline-block" />
              <span>Submissions</span>
            </div>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val} tasks`, 'Completed']}
                />
                <Bar dataKey="submissions" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Personal Targets Tracker */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Personal Targets</h3>
              </div>
              <Link to="/calendar" className="text-xs text-violet-400 hover:text-violet-300">
                Adjust
              </Link>
            </div>

            <div className="space-y-4">
              {/* Weekly Task Target */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Weekly Tasks Completed</span>
                  <span className="font-bold text-white">
                    {targets.weeklyTasks.completed} / {targets.weeklyTasks.target}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-violet-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${targets.weeklyTasks.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {targets.weeklyTasks.percentage >= 100
                    ? '🎉 Weekly quest goal achieved!'
                    : `${targets.weeklyTasks.target - targets.weeklyTasks.completed} more tasks needed this week`}
                </p>
              </div>

              {/* Coin Savings Goal */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Coin Goal Target</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    {targets.coinGoal.current} / {targets.coinGoal.target}
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500 shadow-glow-gold"
                    style={{ width: `${targets.coinGoal.percentage}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  {targets.coinGoal.percentage >= 100
                    ? '🏆 Goal reached! You are a Coin Tycoon!'
                    : `${Math.max(0, targets.coinGoal.target - targets.coinGoal.current)} coins to milestone`}
                </p>
              </div>
            </div>
          </div>

          {/* Early Bird Incentive Reminder */}
          <div className="mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center gap-2.5 text-xs text-violet-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Submit before your peers to score up to +50 bonus coins on any task!</span>
          </div>
        </div>
      </div>

      {/* 4. Upcoming Deadlines Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">Upcoming Academic Deadlines</h3>
            <p className="text-xs text-slate-400">Stay ahead of due dates for maximum bonus points</p>
          </div>
          <Link
            to="/tasks"
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <span>View All Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingDeadlines.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No pending upcoming deadlines found. Great job!
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {upcomingDeadlines.map((task: any) => {
              const badge = getCategoryBadge(task.category);
              return (
                <div
                  key={task._id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                    <div>
                      <Link
                        to={`/tasks/${task._id}`}
                        className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition"
                      >
                        {task.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {task.subject?.code} • {task.subject?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <CountdownTimer deadline={task.deadline} isSubmitted={task.isSubmitted} />
                    <Link
                      to={`/tasks/${task._id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-violet-600 text-slate-200 hover:text-white border border-white/10 transition"
                    >
                      {task.isSubmitted ? 'View Work' : 'Submit Now'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Subject Progress Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">Coursework & Subjects</h3>
            <p className="text-xs text-slate-400">Completion progress across enrolled courses</p>
          </div>
          <Link
            to="/subjects"
            className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            <span>All Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectProgress.map((subj: any) => (
            <Link
              key={subj.id}
              to={`/subjects/${subj.id}`}
              className="p-4 rounded-2xl bg-[#111726] border border-white/10 hover:border-violet-500/40 transition group hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                  style={{ backgroundColor: `${subj.color}30`, borderColor: subj.color }}
                >
                  {subj.code}
                </span>
                <span className="text-xs font-bold text-white">{subj.progressPct}%</span>
              </div>
              <h4 className="text-xs font-bold text-slate-200 group-hover:text-violet-400 transition line-clamp-1">
                {subj.name}
              </h4>
              <p className="text-[10px] text-slate-400 mt-1">
                {subj.completedTasks} of {subj.totalTasks} completed
              </p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${subj.progressPct}%`, backgroundColor: subj.color || '#8b5cf6' }}
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals for Admins */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={() => fetchStats()}
      />
      <CreateSubjectModal
        isOpen={isCreateSubjectOpen}
        onClose={() => setIsCreateSubjectOpen(false)}
        onSuccess={() => fetchStats()}
      />
    </div>
  );
};

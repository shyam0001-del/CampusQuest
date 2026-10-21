import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { StatCard } from '../components/common/StatCard';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { getCategoryBadge } from '../lib/utils';
import { CreateTaskModal } from '../components/common/CreateTaskModal';
import { CreateSubjectModal } from '../components/common/CreateSubjectModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'submissions' | 'coins'>('submissions');
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(7);
  const [isRefreshingChart, setIsRefreshingChart] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);
  const latestRequestIdRef = useRef(0);

  const fetchStats = async (range: number = chartRange, silent: boolean = false) => {
    const requestId = ++latestRequestIdRef.current;
    if (!silent) {
      setError(null);
    } else {
      setIsRefreshingChart(true);
    }
    try {
      const res = await api.get<{
        success: boolean;
        stats: any;
        upcomingDeadlines: any[];
        subjectProgress: any[];
        activityData: any[];
        recentActivity: any[];
        targets: any;
      }>(`/analytics/dashboard?days=${range}`);

      // Discard stale out-of-order response if user changed range again
      if (requestId !== latestRequestIdRef.current) {
        return;
      }

      if (res.success) {
        setData(res);
        setError(null);
      } else {
        setError('Failed to load dashboard data');
      }
    } catch (err: any) {
      if (requestId !== latestRequestIdRef.current) {
        return;
      }
      console.error('Failed to load dashboard data:', err);
      if (!silent) {
        setError(err?.response?.data?.message || err?.message || 'Error loading dashboard data');
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
        setIsRefreshingChart(false);
      }
    }
  };

  useEffect(() => {
    fetchStats(chartRange);
  }, [user]);

  const handleRangeChange = (newRange: 7 | 14 | 30) => {
    if (newRange === chartRange) return;
    setChartRange(newRange);
    fetchStats(newRange, true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-white">Unable to load dashboard data</h2>
        <p className="text-sm text-slate-400 max-w-md">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchStats(chartRange);
          }}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
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

  const chartThemeConfig = {
    black: {
      barSubmissions: '#A78BFA',
      barCoins: '#FBBF24',
      axis: '#D4D4D4',
      grid: '#404040',
      tooltipBg: '#171717',
      tooltipBorder: '#404040',
      tooltipText: '#FFFFFF',
    },
    white: {
      barSubmissions: '#6366F1',
      barCoins: '#D97706',
      axis: '#555555',
      grid: '#E5E7EB',
      tooltipBg: '#FFFFFF',
      tooltipBorder: '#D4D4D4',
      tooltipText: '#111111',
    },
    default: {
      barSubmissions: '#8B5CF6',
      barCoins: '#F59E0B',
      axis: '#4B5563',
      grid: '#E5E7EB',
      tooltipBg: '#FFFFFF',
      tooltipBorder: '#D1D5DB',
      tooltipText: '#111827',
    },
  };
  const activeChart = chartThemeConfig[theme] || chartThemeConfig.default;
  const hasActivity = activityData.some((item: any) =>
    chartMetric === 'submissions' ? (item.submissions || 0) > 0 : (item.coins || 0) > 0
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-[#111726] border border-white/10 p-4 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl ring-2 ring-violet-500/40 shadow-glow-violet object-cover bg-violet-950 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {user?.role === 'admin' ? 'Faculty Admin' : `Rank #${stats.rank || user?.rank || 1} • Level ${user?.level || 1}`}
                </span>
                {user?.role === 'student' && (
                  <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                    {user?.streak || 0}d streak
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-white mt-1.5 tracking-tight truncate">
                Welcome back, {user?.name || 'Student'}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                {user?.role === 'admin'
                  ? 'Monitor class submissions, publish academic tasks, and configure reward policies.'
                  : 'Turn in coursework before deadlines to claim first-place podium coins & level up.'}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {user?.role === 'admin' || user?.role === 'faculty' ? (
              <>
                <button
                  onClick={() => setIsCreateSubjectOpen(true)}
                  className="flex-1 md:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <BookOpen className="w-4 h-4 text-violet-400" />
                  <span>+ Subject</span>
                </button>
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="flex-1 md:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Publish Task</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/tasks"
                  className="flex-1 md:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2 min-h-[40px]"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Pending Tasks</span>
                </Link>
                <Link
                  to="/leaderboard"
                  className="flex-1 md:flex-initial px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-white/10 transition flex items-center justify-center gap-2 min-h-[40px]"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
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
        {/* Activity Rhythm Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg relative flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-violet-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Activity Rhythm</h3>
                {isRefreshingChart && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                )}
              </div>
              <p className="text-xs text-slate-400">
                {chartMetric === 'submissions'
                  ? 'Submissions completed per day'
                  : 'Gold coins earned per day'}
              </p>
            </div>

            {/* Controls: Metric Switcher and Date Range */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Metric Selector */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMetric('submissions')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    chartMetric === 'submissions'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Submissions
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('coins')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    chartMetric === 'coins'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Coins
                </button>
              </div>

              {/* Date Range Selector */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs">
                {([7, 14, 30] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRangeChange(r)}
                    className={`px-2 py-1 rounded-lg font-semibold transition ${
                      chartRange === r
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-60 w-full min-h-[220px] relative">
            {!hasActivity && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/5 dark:bg-black/20 backdrop-blur-[1px] rounded-xl z-10 pointer-events-none text-center p-4">
                <p className="text-xs font-semibold text-slate-300">
                  No {chartMetric === 'submissions' ? 'submissions' : 'coins earned'} recorded in the last {chartRange} days
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Turn in pending tasks to generate activity data
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={activeChart.grid} />
                <XAxis dataKey="day" stroke={activeChart.axis} fontSize={11} tickLine={false} />
                <YAxis stroke={activeChart.axis} fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(150, 150, 150, 0.08)' }}
                  contentStyle={{
                    backgroundColor: activeChart.tooltipBg,
                    borderColor: activeChart.tooltipBorder,
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: activeChart.tooltipText,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                  }}
                  itemStyle={{ color: activeChart.tooltipText }}
                  labelStyle={{ color: activeChart.tooltipText, fontWeight: 700, marginBottom: 4 }}
                  formatter={(val: any) => [
                    chartMetric === 'submissions' ? `${val} tasks` : `${val} coins`,
                    chartMetric === 'submissions' ? 'Submissions' : 'Coins Earned',
                  ]}
                />
                <Bar
                  dataKey={chartMetric}
                  fill={chartMetric === 'submissions' ? activeChart.barSubmissions : activeChart.barCoins}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
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

        {subjectProgress.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#111726]/60 border border-white/5 text-xs text-slate-400">
            No subjects or coursework available yet.
          </div>
        ) : (
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
        )}
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

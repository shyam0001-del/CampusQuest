import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Medal,
  Flame,
  Coins,
  Search,
  Filter,
  CheckCircle,
  Crown,
  Sparkles,
  Info,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { LeaderboardUser } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [topThree, setTopThree] = useState<LeaderboardUser[]>([]);
  const [period, setPeriod] = useState<'all_time' | 'semester' | 'monthly' | 'weekly'>('all_time');
  const [department, setDepartment] = useState('all');
  const [section, setSection] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);
  const [autoPoll, setAutoPoll] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Prevent overlapping concurrent network requests
  const isFetchingRef = useRef<boolean>(false);

  // Initial and filter-triggered fetch
  useEffect(() => {
    fetchLeaderboard(false);
  }, [period, department, section]);

  // Periodic polling every 30 seconds with automatic cleanup on unmount
  useEffect(() => {
    if (!autoPoll) return;

    const intervalId = setInterval(() => {
      fetchLeaderboard(true);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoPoll, period, department, section]);

  const fetchLeaderboard = async (isManualOrPoll = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isManualOrPoll) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (department !== 'all') params.set('department', department);
      if (section !== 'all') params.set('section', section);

      const res = await api.get<{
        success: boolean;
        leaderboard: LeaderboardUser[];
        topThree: LeaderboardUser[];
        currentUserRank: any;
      }>(`/leaderboard?${params.toString()}`);

      if (res.success) {
        setLeaderboard(res.leaderboard);
        setTopThree(res.topThree || []);
        setCurrentUserRank(res.currentUserRank);
        setLastUpdated(new Date());
      } else {
        setError('Failed to fetch latest rankings from server.');
      }
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.message || 'Unable to load leaderboard. Please check your network or click Retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  const filteredLeaderboard = leaderboard.filter(
    (student) =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-glow-gold flex-wrap justify-center">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Live Academic Rankings • {autoPoll ? 'Auto-refreshing every 30s' : 'Manual refresh mode'}
          </span>
          <span className="text-[10px] text-amber-400/80 font-mono">
            (Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          CampusQuest Leaderboard 🏆
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Ranked dynamically by total submission points, early-bird podium wins, coin balances, and verified completion streaks.
        </p>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center justify-center gap-1 p-1 rounded-2xl bg-slate-900 border border-white/10 max-w-md mx-auto text-[10px] sm:text-xs font-semibold">
        {[
          { label: 'All-Time', value: 'all_time' },
          { label: 'Semester V', value: 'semester' },
          { label: 'This Month', value: 'monthly' },
          { label: 'This Week', value: 'weekly' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value as any)}
            className={`flex-1 py-1.5 sm:py-2 px-1 rounded-xl transition ${
              period === tab.value
                ? 'bg-violet-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic 3D Podium Graphic */}
      {topThree.length > 0 && !loading && (
        <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 px-1">
          <div
            className={`flex items-end justify-center gap-2 sm:gap-4 md:gap-6 mx-auto ${
              topThree.length === 1
                ? 'max-w-xs'
                : topThree.length === 2
                ? 'max-w-lg'
                : 'max-w-2xl'
            }`}
          >
            {/* Rank 2 (Silver) - Shown when at least 2 students exist */}
            {topThree.length >= 2 && (
              <div className="flex-1 flex flex-col items-center min-w-0">
                <div className="relative mb-1.5 sm:mb-2">
                  <img
                    src={topThree[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[1].name}`}
                    alt={topThree[1].name}
                    className="w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ring-2 ring-slate-300 shadow-lg object-cover bg-slate-900"
                  />
                  <div className="absolute -top-2 -right-1.5 sm:-top-2.5 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300 text-slate-900 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md">
                    2
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs md:text-sm font-bold text-white text-center truncate max-w-[75px] xs:max-w-[95px] sm:max-w-[120px]">
                  {topThree[1].name}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{topThree[1].leaderboardPoints} pts</span>
                </p>
                <div className="w-full h-18 sm:h-24 md:h-28 mt-2 sm:mt-3 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-t from-slate-800/80 to-slate-700/60 border-t-2 border-slate-300/60 flex items-center justify-center font-black text-slate-400 text-sm sm:text-lg md:text-xl shadow-lg">
                  🥈 2nd
                </div>
              </div>
            )}

            {/* Rank 1 (Gold Champion) - Always shown when at least 1 student exists */}
            {topThree.length >= 1 && (
              <div
                className={`flex-1 flex flex-col items-center -mt-4 sm:-mt-6 min-w-0 ${
                  topThree.length === 1 ? 'w-full max-w-[240px]' : ''
                }`}
              >
                <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 fill-amber-400 animate-bounce mb-0.5 sm:mb-1 shrink-0" />
                <div className="relative mb-1.5 sm:mb-2">
                  <img
                    src={topThree[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[0].name}`}
                    alt={topThree[0].name}
                    className="w-14 h-14 xs:w-16 xs:h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl ring-2 sm:ring-4 ring-amber-400 shadow-glow-gold object-cover bg-violet-950"
                  />
                  <div className="absolute -top-2 -right-1.5 sm:-top-2.5 sm:-right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black text-[10px] sm:text-xs flex items-center justify-center shadow-lg">
                    1
                  </div>
                </div>
                <p className="text-xs sm:text-sm md:text-base font-extrabold text-white text-center truncate max-w-[85px] xs:max-w-[110px] sm:max-w-[150px]">
                  {topThree[0].name}
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span className="truncate">{topThree[0].leaderboardPoints} pts</span>
                </p>
                <div className="w-full h-24 sm:h-32 md:h-36 mt-2 sm:mt-3 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-t from-amber-950/60 via-amber-900/40 to-amber-700/50 border-t-2 border-amber-400 flex flex-col items-center justify-center font-black text-amber-300 text-base sm:text-2xl shadow-glow-gold">
                  <span>🥇</span>
                  <span className="text-[9px] sm:text-xs uppercase tracking-wider mt-0.5 sm:mt-1 text-amber-200">Champion</span>
                </div>
              </div>
            )}

            {/* Rank 3 (Bronze) - Shown when at least 3 students exist */}
            {topThree.length >= 3 && (
              <div className="flex-1 flex flex-col items-center min-w-0">
                <div className="relative mb-1.5 sm:mb-2">
                  <img
                    src={topThree[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[2].name}`}
                    alt={topThree[2].name}
                    className="w-11 h-11 xs:w-13 xs:h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl ring-2 ring-amber-700 shadow-lg object-cover bg-slate-900"
                  />
                  <div className="absolute -top-2 -right-1.5 sm:-top-2.5 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-700 text-white font-black text-[10px] sm:text-xs flex items-center justify-center shadow-md">
                    3
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs md:text-sm font-bold text-white text-center truncate max-w-[75px] xs:max-w-[95px] sm:max-w-[120px]">
                  {topThree[2].name}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                  <Coins className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{topThree[2].leaderboardPoints} pts</span>
                </p>
                <div className="w-full h-14 sm:h-20 md:h-22 mt-2 sm:mt-3 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-t from-amber-950/60 to-amber-900/40 border-t-2 border-amber-700/60 flex items-center justify-center font-black text-amber-600 text-sm sm:text-lg md:text-xl shadow-lg">
                  🥉 3rd
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty Podium State when 0 students exist */}
      {topThree.length === 0 && !loading && (
        <div className="pt-6 pb-2">
          <div className="p-8 rounded-3xl bg-[#111726] border border-white/10 text-center max-w-md mx-auto space-y-2">
            <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-white text-sm">Podium Awaiting Challengers</h3>
            <p className="text-xs text-slate-400">
              No students are currently ranked on the podium. Submit assignments and claim early-bird bonuses to take the top spot!
            </p>
          </div>
        </div>
      )}

      {/* Filter Row with Refresh & Auto-Poll */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#111726] border border-white/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leaderboard by student name or roll..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="flex-1 min-w-[130px] sm:w-44 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science & Engineering">CSE</option>
            <option value="Information Technology">IT</option>
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="flex-1 min-w-[110px] sm:w-36 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="all">All Sections</option>
            <option value="Section A">Section A</option>
            <option value="Section B">Section B</option>
          </select>

          <button
            type="button"
            onClick={() => setAutoPoll(!autoPoll)}
            title={autoPoll ? 'Auto-refresh active (every 30s). Click to pause.' : 'Auto-refresh paused. Click to enable 30s polling.'}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition shrink-0 min-h-[38px] ${
              autoPoll
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoPoll ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span>{autoPoll ? 'Auto 30s' : 'Auto: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            disabled={loading || refreshing}
            title="Fetch latest rankings while preserving active filters"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition shadow-glow-violet disabled:opacity-50 shrink-0 min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State for initial fetch */}
      {loading && leaderboard.length === 0 && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-violet-400 mx-auto animate-spin" />
          <h3 className="font-bold text-white text-sm">Querying Live Academic Rankings...</h3>
          <p className="text-xs text-slate-400">Loading student points, podium bonuses, and streaks from database.</p>
        </div>
      )}

      {/* Current User Standout Row */}
      {(!loading || leaderboard.length > 0) && currentUserRank && user?.role === 'student' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111726] border border-violet-500/40 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center justify-center shadow-md shrink-0">
              #{currentUserRank.rank}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">Your Current Standings</p>
              <p className="text-[11px] text-violet-300 truncate">
                Ranked #{currentUserRank.rank} with {currentUserRank.points} leaderboard points.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-400 flex items-center gap-1 shrink-0">
            <Coins className="w-4 h-4 fill-amber-400" />
            <span>{currentUserRank.coins} coins</span>
          </span>
        </div>
      )}

      {/* Rankings Section: Mobile Cards (< md) & Horizontally Scrollable Table (>= md) */}
      {(!loading || leaderboard.length > 0) && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
          {/* Mobile Card List (visible on screens < md) */}
          <div className="block md:hidden divide-y divide-white/5">
            {filteredLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No student rankings found</p>
                <p className="text-xs text-slate-500">
                  {search || department !== 'all' || section !== 'all'
                    ? 'No students match your filter criteria.'
                    : 'Submit coursework on-time to climb the leaderboard!'}
                </p>
              </div>
            ) : (
              filteredLeaderboard.map((student) => {
                const isMe = user?.id === student._id.toString();
                return (
                  <div
                    key={student._id}
                    className={`p-3.5 transition space-y-2.5 ${
                      isMe ? 'bg-violet-950/30 border-l-4 border-violet-500' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0">
                          {student.rank === 1 ? (
                            <span className="text-amber-400 text-sm">🥇 1</span>
                          ) : student.rank === 2 ? (
                            <span className="text-slate-300 text-sm">🥈 2</span>
                          ) : student.rank === 3 ? (
                            <span className="text-amber-600 text-sm">🥉 3</span>
                          ) : (
                            <span className="text-slate-400">#{student.rank}</span>
                          )}
                        </div>

                        <img
                          src={student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`}
                          alt={student.name}
                          className="w-8 h-8 rounded-xl object-cover bg-violet-950 ring-1 ring-white/10 shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                            <span>{student.name}</span>
                            {isMe && (
                              <span className="px-1.5 py-0.2 rounded-full bg-violet-500/30 text-violet-300 text-[9px]">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {student.rollNumber} • {student.section}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-amber-400 block">
                          {student.leaderboardPoints} pts
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {student.tasksCompleted} tasks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 text-slate-400">
                      <span className="truncate max-w-[140px] text-[10px]">{student.department}</span>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          ⚡ {student.earlyBirdBonuses}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-rose-400 text-[10px]">
                          <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />
                          {student.streak}d
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table (visible on screens >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4 w-16 text-center">Rank</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Department & Section</th>
                  <th className="p-4 text-center">Tasks Completed</th>
                  <th className="p-4 text-center">Podium Early Bonuses</th>
                  <th className="p-4 text-center">Streak</th>
                  <th className="p-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-300">No student rankings yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {search || department !== 'all' || section !== 'all'
                          ? 'No students match your filter criteria.'
                          : 'Submit coursework on-time and claim early-bird bonuses to climb the leaderboard!'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLeaderboard.map((student) => {
                    const isMe = user?.id === student._id.toString();

                    return (
                      <tr
                        key={student._id}
                        className={`transition ${
                          isMe
                            ? 'bg-violet-950/30 hover:bg-violet-950/40 font-semibold'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="p-4 text-center font-extrabold text-sm">
                          {student.rank === 1 ? (
                            <span className="text-amber-400">🥇 1</span>
                          ) : student.rank === 2 ? (
                            <span className="text-slate-300">🥈 2</span>
                          ) : student.rank === 3 ? (
                            <span className="text-amber-600">🥉 3</span>
                          ) : (
                            <span className="text-slate-500">#{student.rank}</span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`}
                              alt={student.name}
                              className="w-8 h-8 rounded-xl object-cover bg-violet-950 ring-1 ring-white/10"
                            />
                            <div>
                              <p className="font-bold text-slate-200 flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {isMe && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-violet-500/30 text-violet-300 text-[9px]">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">{student.rollNumber}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-slate-400">
                          <p>{student.department}</p>
                          <p className="text-[10px] text-slate-500">{student.section}</p>
                        </td>

                        <td className="p-4 text-center font-bold text-slate-200">
                          {student.tasksCompleted}
                        </td>

                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            ⚡ {student.earlyBirdBonuses}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-rose-400">
                            <Flame className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                            {student.streak}d
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <span className="font-black text-amber-400 text-sm">
                            {student.leaderboardPoints} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tie-Breaker Explanation Banner */}
          <div className="p-3.5 sm:p-4 bg-slate-900/60 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-violet-400 shrink-0" />
            <span>
              <strong>Tie-Breaking Policy:</strong> Points &gt; Early Bird Podium Bonuses &gt; Total Lifetime Coins &gt; Submission Streak &gt; Earliest Registration Timestamp.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

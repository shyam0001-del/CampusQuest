import React, { useState, useEffect } from 'react';
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
  const [currentUserRank, setCurrentUserRank] = useState<any>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, department, section]);

  const fetchLeaderboard = async () => {
    setLoading(true);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-glow-gold">
          <Trophy className="w-3.5 h-3.5" />
          <span>Live Academic Rankings</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          CampusQuest Leaderboard 🏆
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Ranked dynamically by total submission points, early-bird podium wins, coin balances, and verified completion streaks.
        </p>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center justify-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-white/10 max-w-md mx-auto text-xs font-semibold">
        {[
          { label: 'All-Time', value: 'all_time' },
          { label: 'Semester V', value: 'semester' },
          { label: 'This Month', value: 'monthly' },
          { label: 'This Week', value: 'weekly' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value as any)}
            className={`flex-1 py-2 rounded-xl transition ${
              period === tab.value
                ? 'bg-violet-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 3D Podium Graphic */}
      {topThree.length >= 3 && !loading && (
        <div className="pt-8 pb-4">
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto">
            {/* Rank 2 (Silver) */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={topThree[1].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[1].name}`}
                  alt={topThree[1].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-2 ring-slate-300 shadow-lg object-cover bg-slate-900"
                />
                <div className="absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs flex items-center justify-center shadow-md">
                  2
                </div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white text-center truncate max-w-[110px]">
                {topThree[1].name}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                {topThree[1].leaderboardPoints} pts
              </p>
              <div className="w-full h-24 sm:h-28 mt-3 rounded-t-2xl bg-gradient-to-t from-slate-800/80 to-slate-700/60 border-t-2 border-slate-300/60 flex items-center justify-center font-black text-slate-400 text-xl shadow-lg">
                🥈 2nd
              </div>
            </div>

            {/* Rank 1 (Gold) */}
            <div className="flex-1 flex flex-col items-center -mt-6">
              <Crown className="w-8 h-8 text-amber-400 fill-amber-400 animate-bounce mb-1" />
              <div className="relative mb-2">
                <img
                  src={topThree[0].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[0].name}`}
                  alt={topThree[0].name}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl ring-4 ring-amber-400 shadow-glow-gold object-cover bg-violet-950"
                />
                <div className="absolute -top-2.5 -right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 font-black text-xs flex items-center justify-center shadow-lg">
                  1
                </div>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-white text-center truncate max-w-[130px]">
                {topThree[0].name}
              </p>
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {topThree[0].leaderboardPoints} pts
              </p>
              <div className="w-full h-32 sm:h-36 mt-3 rounded-t-2xl bg-gradient-to-t from-amber-950/60 via-amber-900/40 to-amber-700/50 border-t-2 border-amber-400 flex flex-col items-center justify-center font-black text-amber-300 text-2xl shadow-glow-gold">
                <span>🥇</span>
                <span className="text-xs uppercase tracking-wider mt-1 text-amber-200">Champion</span>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="flex-1 flex flex-col items-center">
              <div className="relative mb-2">
                <img
                  src={topThree[2].avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${topThree[2].name}`}
                  alt={topThree[2].name}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ring-2 ring-amber-700 shadow-lg object-cover bg-slate-900"
                />
                <div className="absolute -top-2.5 -right-2 w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-md">
                  3
                </div>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white text-center truncate max-w-[110px]">
                {topThree[2].name}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Coins className="w-3 h-3 text-amber-400" />
                {topThree[2].leaderboardPoints} pts
              </p>
              <div className="w-full h-20 sm:h-22 mt-3 rounded-t-2xl bg-gradient-to-t from-amber-950/60 to-amber-900/40 border-t-2 border-amber-700/60 flex items-center justify-center font-black text-amber-600 text-xl shadow-lg">
                🥉 3rd
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#111726] border border-white/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leaderboard by student name or roll..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="flex-1 sm:w-44 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Departments</option>
            <option value="Computer Science & Engineering">CSE</option>
            <option value="Information Technology">IT</option>
          </select>

          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="flex-1 sm:w-36 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Sections</option>
            <option value="Section A">Section A</option>
            <option value="Section B">Section B</option>
          </select>
        </div>
      </div>

      {/* Current User Standout Row */}
      {currentUserRank && user?.role === 'student' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-600/20 via-indigo-600/20 to-cyan-500/10 border border-violet-500/40 shadow-glow-violet flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center justify-center shadow-md">
              #{currentUserRank.rank}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Your Current Standings</p>
              <p className="text-[11px] text-violet-300">
                You are currently ranked #{currentUserRank.rank} with {currentUserRank.points} leaderboard points.
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-amber-400 flex items-center gap-1 shrink-0">
            <Coins className="w-4 h-4 fill-amber-400" />
            {currentUserRank.coins} coins
          </span>
        </div>
      )}

      {/* Rankings Table */}
      <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
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
              {filteredLeaderboard.map((student) => {
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
              })}
            </tbody>
          </table>
        </div>

        {/* Tie-Breaker Explanation Banner */}
        <div className="p-4 bg-slate-900/60 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-violet-400 shrink-0" />
          <span>
            <strong>Tie-Breaking Policy:</strong> Points &gt; Early Bird Podium Bonuses &gt; Total Lifetime Coins &gt; Submission Streak &gt; Earliest Registration Timestamp.
          </span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  User,
  Coins,
  Trophy,
  Flame,
  Award,
  Save,
  Clock,
  History,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export const ProfilePage: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [department, setDepartment] = useState(user?.department || 'Computer Science & Engineering');
  const [section, setSection] = useState(user?.section || 'Section A');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    fetchMySubmissions();
  }, []);

  const fetchMySubmissions = async () => {
    try {
      const res = await api.get<{ success: boolean; submissions: any[] }>('/submissions/my-submissions');
      if (res.success) {
        setSubmissions(res.submissions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.put<{ success: boolean; user: any }>('/auth/profile', {
        name,
        rollNumber,
        department,
        section,
      });

      if (res.success) {
        updateUser(res.user);
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage(err.message || 'Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-violet-400" />
          <span>Cadet Profile & Quest Ledger</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review academic credentials, submission audit logs, and coin reward transactions.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-4 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.name}`}
              alt={user?.name}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl ring-2 ring-violet-500/40 shadow-glow-violet object-cover bg-violet-950 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase">
                  {user?.role}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-400 font-mono">{user?.rollNumber}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1 truncate">{user?.name}</h2>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center min-w-0 sm:min-w-[85px]">
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">Coins</p>
              <p className="text-base sm:text-lg font-black text-amber-400 mt-0.5">{user?.coins || 0}</p>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center min-w-0 sm:min-w-[85px]">
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">Level</p>
              <p className="text-base sm:text-lg font-black text-violet-400 mt-0.5">{user?.level || 1}</p>
            </div>
            <div className="p-2.5 sm:p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center min-w-0 sm:min-w-[85px]">
              <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">Streak</p>
              <p className="text-base sm:text-lg font-black text-rose-400 mt-0.5">{user?.streak || 0}d</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSaveProfile} className="pt-6 border-t border-white/5 space-y-4 text-xs">
          {message && (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 font-semibold">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Roll Number</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 text-white transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Submission & Reward History */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-base text-white">Auditable Submission & Reward Ledger</h3>
        </div>

        {submissions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No submissions recorded on this account yet.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {submissions.map((sub: any) => (
              <div
                key={sub._id}
                className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-200">{sub.task?.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sub.subject?.code} • {new Date(sub.submittedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {sub.bonusRankAwarded && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      🥇 {sub.bonusRankAwarded === 1 ? '1st' : sub.bonusRankAwarded === 2 ? '2nd' : '3rd'} Bonus
                    </span>
                  )}
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    +{sub.rewardCoins} coins
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

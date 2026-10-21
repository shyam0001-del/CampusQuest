import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Coins,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  ExternalLink,
  FileText,
  User,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import { Task, Submission } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getCategoryBadge } from '../lib/utils';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { SubmitWorkModal } from '../components/common/SubmitWorkModal';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [topEarlySubmitters, setTopEarlySubmitters] = useState<any[]>([]);
  const [userSubmission, setUserSubmission] = useState<Submission | null>(null);
  const [rosterData, setRosterData] = useState<any>(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterStatusFilter, setRosterStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
    if (user?.role === 'admin') {
      fetchRoster();
    }
  }, [id, user]);

  const fetchTaskDetails = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        task: Task;
        topEarlySubmitters: any[];
        userSubmission: Submission | null;
      }>(`/tasks/${id}`);

      if (res.success) {
        setTask(res.task);
        setTopEarlySubmitters(res.topEarlySubmitters || []);
        setUserSubmission(res.userSubmission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await api.get<any>(`/tasks/${id}/roster`);
      if (res.success) {
        setRosterData(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCSV = () => {
    window.open(`/api/tasks/${id}/export-csv`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 space-y-3">
        <h3 className="text-lg font-bold text-white">Task not found</h3>
        <Link to="/tasks" className="text-violet-400 text-xs hover:underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  const categoryBadge = getCategoryBadge(task.category);

  // Filtered admin roster
  const filteredRoster = (rosterData?.roster || []).filter((item: any) => {
    const matchesSearch =
      item.student.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
      item.student.rollNumber.toLowerCase().includes(rosterSearch.toLowerCase());
    const matchesStatus = rosterStatusFilter === 'all' || item.status === rosterStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Back button & Subject Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tasks</span>
        </Link>

        <span
          className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
          style={{
            backgroundColor: `${task.subject?.color || '#8b5cf6'}30`,
            borderColor: task.subject?.color || '#8b5cf6',
          }}
        >
          {task.subject?.code}: {task.subject?.name}
        </span>
      </div>

      {/* Hero Task Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${categoryBadge.bg} ${categoryBadge.text} ${categoryBadge.border}`}
          >
            {categoryBadge.label}
          </span>
          <CountdownTimer deadline={task.deadline} isSubmitted={!!userSubmission} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {task.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Deadline: {new Date(task.deadline).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200">{task.maxBasePoints} Base Coins</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{task.submissionCount} Submissions Turned In</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Instructions + Early Bird Podium Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Instructions and Submission Status */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions Card */}
          <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-4">
            <h3 className="font-bold text-base text-white">Instructions & Objectives</h3>
            <div className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-slate-900/50 p-4 rounded-2xl border border-white/5 font-mono">
              {task.instructions || task.description || 'No additional instructions specified.'}
            </div>
          </div>

          {/* Student Submission Card */}
          {user?.role === 'student' && (
            <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-4">
              <h3 className="font-bold text-base text-white">Your Submission Status</h3>

              {userSubmission ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Turned In • {new Date(userSubmission.submittedAt).toLocaleString()}
                    </span>
                    <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      +{userSubmission.rewardCoins} coins earned
                    </span>
                  </div>

                  {userSubmission.bonusRankAwarded && (
                    <div className="text-xs font-semibold text-amber-300">
                      🏆 Congratulations! You claimed the {userSubmission.bonusRankAwarded}
                      {userSubmission.bonusRankAwarded === 1
                        ? 'st'
                        : userSubmission.bonusRankAwarded === 2
                        ? 'nd'
                        : 'rd'}{' '}
                      place Early Bird Podium Bonus!
                    </div>
                  )}

                  {userSubmission.submissionType === 'file' && userSubmission.fileUrl && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <FileText className="w-4 h-4 text-violet-400" />
                      <span>Attached file:</span>
                      <a
                        href={userSubmission.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 underline font-semibold truncate max-w-xs"
                      >
                        {userSubmission.fileName || 'Download Submission'}
                      </a>
                    </div>
                  )}

                  {userSubmission.submissionType === 'url' && userSubmission.submissionUrl && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <ExternalLink className="w-4 h-4 text-cyan-400" />
                      <span>URL:</span>
                      <a
                        href={userSubmission.submissionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline truncate max-w-xs"
                      >
                        {userSubmission.submissionUrl}
                      </a>
                    </div>
                  )}

                  {userSubmission.textResponse && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-300 font-mono">
                      {userSubmission.textResponse}
                    </div>
                  )}

                  {task.allowResubmission && (
                    <div className="pt-2">
                      <button
                        onClick={() => setIsSubmitModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition"
                      >
                        Update / Resubmit Work
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-white/15 text-center space-y-3">
                  <Upload className="w-10 h-10 text-violet-400 mx-auto animate-bounce" />
                  <p className="text-xs font-bold text-white">Work Not Yet Submitted</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Submit on-time to qualify for base rewards and up to +{task.bonusRules?.firstBonus || 50} early bird bonus coins!
                  </p>
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="mt-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition"
                  >
                    Submit Work Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Early Bird Economy & Top 3 Podium */}
        <div className="space-y-6">
          {/* Bonus Rules Card */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">Podium Bonus Policy</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                <span>🥇 1st Valid Submitter</span>
                <span>+{task.bonusRules?.firstBonus || 50} coins</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-300/10 border border-slate-300/30 text-slate-200 font-bold">
                <span>🥈 2nd Valid Submitter</span>
                <span>+{task.bonusRules?.secondBonus || 35} coins</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-700/10 border border-amber-600/30 text-amber-400 font-bold">
                <span>🥉 3rd Valid Submitter</span>
                <span>+{task.bonusRules?.thirdBonus || 20} coins</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Submissions after the top 3 on-time turn-ins receive the standard base reward ({task.maxBasePoints} coins). Late turn-ins incur a {task.bonusRules?.latePenaltyPct || 50}% point reduction.
              </p>
            </div>
          </div>

          {/* Top 3 Early Birds Hall of Fame */}
          <div className="p-5 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-3">
            <h3 className="font-bold text-sm text-white">Top Early Submitters</h3>

            {topEarlySubmitters.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No submissions recorded yet. Be the first to grab the gold crown!
              </p>
            ) : (
              <div className="space-y-2.5">
                {topEarlySubmitters.map((sub, index) => (
                  <div
                    key={sub._id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-sm">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <img
                        src={sub.student?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${sub.student?.name}`}
                        alt={sub.student?.name}
                        className="w-7 h-7 rounded-lg object-cover bg-violet-950"
                      />
                      <div>
                        <p className="font-semibold text-slate-200">{sub.student?.name}</p>
                        <p className="text-[10px] text-slate-400">{sub.student?.rollNumber}</p>
                      </div>
                    </div>
                    <span className="text-amber-400 font-bold text-[11px]">
                      +{sub.rewardCoins} coins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Student Submission Roster (Section 7) */}
      {user?.role === 'admin' && rosterData && (
        <div className="mt-8 p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Student Submission Roster</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {rosterData.stats?.submittedCount} of {rosterData.stats?.totalStudents} students submitted (
                {rosterData.stats?.submissionRate}% completion rate)
              </p>
            </div>

            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-violet-400" />
              <span>Export CSV Roster</span>
            </button>
          </div>

          {/* Filters for Admin Roster */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search students by name or roll number..."
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>

            <select
              value={rosterStatusFilter}
              onChange={(e) => setRosterStatusFilter(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="late">Late Submission</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Roll Number</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Submission Timestamp</th>
                  <th className="p-3.5">Work / Files</th>
                  <th className="p-3.5 text-right">Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredRoster.map((item: any) => (
                  <tr key={item.student.id} className="hover:bg-white/[0.02]">
                    <td className="p-3.5 font-semibold text-slate-200 flex items-center gap-2.5">
                      <img
                        src={item.student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.student.name}`}
                        alt={item.student.name}
                        className="w-7 h-7 rounded-lg object-cover bg-violet-950"
                      />
                      <span>{item.student.name}</span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">{item.student.rollNumber}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'submitted'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.status === 'overdue'
                            ? 'bg-rose-500/15 text-rose-400'
                            : item.status === 'late'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {item.submission
                        ? new Date(item.submission.submittedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {item.submission?.fileUrl ? (
                        <a
                          href={item.submission.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>File</span>
                        </a>
                      ) : item.submission?.submissionUrl ? (
                        <a
                          href={item.submission.submissionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Link</span>
                        </a>
                      ) : item.submission?.textResponse ? (
                        <span className="text-slate-400 italic">Text Response</span>
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-bold text-amber-400">
                      {item.submission ? `+${item.submission.rewardCoins}` : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submit Modal */}
      <SubmitWorkModal
        task={task}
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSuccess={() => {
          fetchTaskDetails();
          if (user?.role === 'admin') fetchRoster();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, AlertCircle, Award } from 'lucide-react';
import { Subject, TaskCategory } from '../../types';
import { api } from '../../lib/api';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSubjectId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSubjectId,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || '');
  const [category, setCategory] = useState<TaskCategory>('assignment');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('23:59');
  const [maxBasePoints, setMaxBasePoints] = useState(100);
  const [firstBonus, setFirstBonus] = useState(50);
  const [secondBonus, setSecondBonus] = useState(35);
  const [thirdBonus, setThirdBonus] = useState(20);
  const [allowResubmission, setAllowResubmission] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      // Default deadline to 7 days from now
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setDeadlineDate(in7Days.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects');
      if (res.success) {
        setSubjects(res.subjects);
        if (!subjectId && res.subjects.length > 0) {
          setSubjectId(defaultSubjectId || res.subjects[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !subjectId || !deadlineDate) {
      setError('Title, Subject, and Deadline date are required');
      return;
    }

    setLoading(true);

    try {
      const deadlineIso = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).toISOString();

      await api.post('/tasks', {
        title: title.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        subject: subjectId,
        category,
        deadline: deadlineIso,
        maxBasePoints: Number(maxBasePoints),
        bonusRules: {
          firstBonus: Number(firstBonus),
          secondBonus: Number(secondBonus),
          thirdBonus: Number(thirdBonus),
          latePenaltyPct: 50,
        },
        allowResubmission,
        status: 'published',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error publishing task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-3xl bg-[#111726] border border-white/10 p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
              Faculty / Admin Task Publisher
            </span>
          </div>
          <h3 className="text-xl font-extrabold text-white mt-1">
            Publish Academic Task & Quest
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Create an assignment, lab activity, presentation, or project with automated early-bird rewards.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Task Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Distributed Consensus & Raft Protocol Simulation"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Subject & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Subject *</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              >
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.code}: {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Task Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="assignment">Assignment</option>
                <option value="lab_activity">Lab Activity</option>
                <option value="presentation">Presentation / PPT</option>
                <option value="practical_record">Practical Record</option>
                <option value="project">Course Project</option>
                <option value="other">Other Activity</option>
              </select>
            </div>
          </div>

          {/* Instructions / Description */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Instructions & Requirements</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="State clear submission criteria, required format (PDF/GitHub repo/zip), and key steps..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Deadline Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Deadline Date *</label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Deadline Time</label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Gamified Reward Settings */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-300">Points & Early Bird Bonus Economy</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 font-medium">Base Points</label>
                <input
                  type="number"
                  value={maxBasePoints}
                  onChange={(e) => setMaxBasePoints(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-slate-200 font-semibold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-400 font-medium">🥇 1st Bonus</label>
                <input
                  type="number"
                  value={firstBonus}
                  onChange={(e) => setFirstBonus(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-500/30 text-amber-300 font-semibold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-300 font-medium">🥈 2nd Bonus</label>
                <input
                  type="number"
                  value={secondBonus}
                  onChange={(e) => setSecondBonus(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-slate-200 font-semibold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-amber-600 font-medium">🥉 3rd Bonus</label>
                <input
                  type="number"
                  value={thirdBonus}
                  onChange={(e) => setThirdBonus(Number(e.target.value))}
                  className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-amber-500 font-semibold text-center"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="resubCheck"
              checked={allowResubmission}
              onChange={(e) => setAllowResubmission(e.target.checked)}
              className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-white/20 focus:ring-0"
            />
            <label htmlFor="resubCheck" className="text-slate-300 select-none cursor-pointer">
              Allow students to update or resubmit their work before the deadline
            </label>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Publish Task & Notify Students</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

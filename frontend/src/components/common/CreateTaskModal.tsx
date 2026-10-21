import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, Award } from 'lucide-react';
import { Subject, TaskCategory } from '../../types';
import { api } from '../../lib/api';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultSubjectId?: string;
  defaultSubjectName?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultSubjectId,
  defaultSubjectName,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState(defaultSubjectName || '');
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
      if (defaultSubjectName) {
        setSubject(defaultSubjectName);
      }
      // Default deadline to 7 days from now
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setDeadlineDate(in7Days.toISOString().split('T')[0]);
    } else {
      // Clear form when closed
      setTitle('');
      setDescription('');
      setInstructions('');
      if (!defaultSubjectName) setSubject('');
      setError(null);
    }
  }, [isOpen, defaultSubjectName]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects');
      if (res.success && Array.isArray(res.subjects)) {
        setSubjects(res.subjects);
        if (defaultSubjectId && !defaultSubjectName) {
          const found = res.subjects.find((s) => s._id === defaultSubjectId);
          if (found) setSubject(found.name);
        }
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    const trimmedSubject = subject.trim();

    if (!trimmedTitle || !trimmedSubject || !deadlineDate) {
      setError('Task Title, Subject, and Deadline date are required');
      return;
    }

    setLoading(true);

    try {
      const deadlineIso = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).toISOString();

      await api.post('/tasks', {
        title: trimmedTitle,
        description: description.trim(),
        instructions: instructions.trim(),
        subject: trimmedSubject,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-3xl bg-[#111726] border border-white/10 p-4 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition min-h-[38px] min-w-[38px] flex items-center justify-center"
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
            {/* Subject (Editable Text Input with Suggestions) */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Subject *</label>
              <input
                type="text"
                required
                list="subject-options"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Operating Systems, DBMS, Networks"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <datalist id="subject-options">
                {subjects.map((s) => (
                  <option key={s._id} value={s.name}>
                    {s.code ? `${s.code}: ` : ''}{s.name}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Task Category Dropdown (Preserved) */}
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

          {/* Gamified Coins & Bonus Rewards Section */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Base Coin Reward & Early Bird Podium Bonuses</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Base Reward</label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={maxBasePoints}
                  onChange={(e) => setMaxBasePoints(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-amber-400 font-semibold">🥇 1st Bonus</label>
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={firstBonus}
                  onChange={(e) => setFirstBonus(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-amber-500/30 text-xs text-amber-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-semibold">🥈 2nd Bonus</label>
                <input
                  type="number"
                  min={0}
                  max={150}
                  value={secondBonus}
                  onChange={(e) => setSecondBonus(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-white/20 text-xs text-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-amber-600 font-semibold">🥉 3rd Bonus</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={thirdBonus}
                  onChange={(e) => setThirdBonus(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-amber-700/30 text-xs text-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Resubmission checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="resubmission"
              checked={allowResubmission}
              onChange={(e) => setAllowResubmission(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-violet-600 focus:ring-violet-500 bg-slate-900"
            />
            <label htmlFor="resubmission" className="text-xs text-slate-300 select-none">
              Allow students to resubmit improved work before the deadline
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white hover:bg-white/5 transition text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>Publish Quest & Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Plus, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COLOR_OPTIONS = [
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Indigo', value: '#6366f1' },
];

const ICON_OPTIONS = ['BookOpen', 'Database', 'Cpu', 'Network', 'Globe', 'Code', 'Binary', 'Server'];

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('Semester V');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [facultyName, setFacultyName] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [icon, setIcon] = useState('BookOpen');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim()) {
      setError('Subject Name and Code are required');
      return;
    }

    setLoading(true);

    try {
      await api.post('/subjects', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        semester,
        academicYear,
        facultyName: facultyName.trim() || 'Faculty In-Charge',
        color,
        icon,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating subject');
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
      <div className="relative w-full max-w-lg rounded-3xl bg-[#111726] border border-white/10 p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
            Academic Curriculum
          </span>
          <h3 className="text-xl font-extrabold text-white mt-1">
            Create Dynamic Subject
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Instantly creates a new course module and enrolls all active students automatically.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="font-semibold text-slate-300">Subject Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Distributed Cloud Systems"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Course Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS-308"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 uppercase focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              >
                <option value="Semester III">Semester III</option>
                <option value="Semester IV">Semester IV</option>
                <option value="Semester V">Semester V</option>
                <option value="Semester VI">Semester VI</option>
                <option value="Semester VII">Semester VII</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Faculty In-Charge</label>
            <input
              type="text"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              placeholder="e.g. Dr. Jennifer Adams"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief course objectives and syllabus overview..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Color theme selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Brand Color Accent</label>
            <div className="flex items-center gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#111726]' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Subject Module</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

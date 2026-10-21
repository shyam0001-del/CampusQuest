import React, { useState } from 'react';
import {
  UserX,
  AlertTriangle,
  Shield,
  FileText,
  Coins,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api } from '../../lib/api';

interface RemoveStudentModalProps {
  isOpen: boolean;
  student: UserType | null;
  potentialDuplicates: UserType[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const RemoveStudentModal: React.FC<RemoveStudentModalProps> = ({
  isOpen,
  student,
  potentialDuplicates,
  onClose,
  onSuccess,
}) => {
  const [reasonPreset, setReasonPreset] = useState<string>('Duplicate student account registration');
  const [customReason, setCustomReason] = useState<string>('');
  const [confirmEmail, setConfirmEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const studentId = student._id || student.id;
  const isEmailConfirmed = confirmEmail.trim().toLowerCase() === student.email.toLowerCase();

  const handleRemove = async () => {
    if (!isEmailConfirmed) {
      setError(`Please type "${student.email}" to confirm account removal.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const finalReason =
        reasonPreset === 'Other'
          ? customReason.trim() || 'Administrative removal'
          : reasonPreset;

      const res = await api.delete<{
        success: boolean;
        message: string;
        preserved?: { submissions: number; coinTransactions: number; unenrolledSubjects: number };
      }>(`/users/${studentId}`, { reason: finalReason });

      if (res.success) {
        onSuccess(res.message);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove student account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-3xl bg-[#111726] border border-rose-500/30 p-4 sm:p-7 shadow-2xl z-10 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
          className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition disabled:opacity-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-5">
          <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              Student Account Removal
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              Remove Student Account
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Securely deactivate student access while preserving historical academic records and audit trails.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Target Student Summary Card */}
        <div className="mb-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={student.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${student.name}`}
              alt={student.name}
              className="w-11 h-11 rounded-2xl bg-violet-500/10 border border-white/10 object-cover"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white text-sm truncate">{student.name}</h4>
              <p className="text-xs font-mono text-cyan-300 truncate">{student.email}</p>
              {student.rollNumber && (
                <span className="text-[11px] text-slate-400 font-mono">
                  Roll No: <strong>{student.rollNumber}</strong>
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block">Balance</span>
              <span className="text-xs font-bold text-amber-300 font-mono">
                🪙 {student.coins || 0} coins
              </span>
              <span className="text-[10px] text-violet-300 block">
                ⭐ {student.points || 0} pts
              </span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span>
              Dept: <strong className="text-slate-300">{student.department || 'N/A'}</strong>
            </span>
            <span>
              Cohort: <strong className="text-slate-300">{student.year || '3rd Year'} ({student.section || 'Sec A'})</strong>
            </span>
            <span>
              Registered:{' '}
              <strong className="text-slate-300">
                {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
              </strong>
            </span>
          </div>
        </div>

        {/* Duplicate Matches Warning (if any) */}
        {potentialDuplicates.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Potential Duplicate Account Matches Detected ({potentialDuplicates.length})</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              We found other student account(s) matching this roll number or student name. Please review the emails below carefully to avoid removing the active student:
            </p>
            <div className="space-y-1.5 pt-1">
              {potentialDuplicates.map((dup) => (
                <div
                  key={dup._id || dup.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/20 flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-semibold text-white block truncate">{dup.name}</span>
                    <span className="text-[11px] font-mono text-amber-300 truncate block">{dup.email}</span>
                  </div>
                  <div className="text-right shrink-0 text-[10px] text-slate-400 font-mono">
                    <span>Roll: {dup.rollNumber || 'N/A'}</span>
                    <span className="block text-slate-500">
                      {dup.createdAt ? new Date(dup.createdAt).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Academic Records & Audit Preservation Notice */}
        <div className="mb-4 p-3.5 rounded-2xl bg-violet-950/30 border border-violet-500/20 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-violet-300 font-semibold text-xs">
            <Shield className="w-4 h-4 text-violet-400 shrink-0" />
            <span>Academic Integrity & Historical Record Preservation</span>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1.5 pl-2 list-disc list-inside">
            <li>
              <strong>Coursework Submissions:</strong> Uploaded assignments and evaluation grades are <em>safely preserved</em> for institutional audit compliance.
            </li>
            <li>
              <strong>Gamification Ledger:</strong> Point and coin transactions remain logged in the financial audit ledger.
            </li>
            <li>
              <strong>Access Revocation:</strong> The student is immediately logged out and blocked from logging in.
            </li>
            <li>
              <strong>Course Rosters:</strong> Automatically unenrolled from active courses and hidden from active leaderboards.
            </li>
            <li>
              <strong>Reversibility:</strong> Administrators can restore/reactivate this account at any time.
            </li>
          </ul>
        </div>

        {/* Reason Selection */}
        <div className="mb-4 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Deactivation Reason *
          </label>
          <select
            value={reasonPreset}
            onChange={(e) => setReasonPreset(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500 transition cursor-pointer"
          >
            <option value="Duplicate student account registration">Duplicate student account registration</option>
            <option value="Student withdrew or transferred from college">Student withdrew or transferred from college</option>
            <option value="Student requested account deletion / removal">Student requested account deletion / removal</option>
            <option value="Academic discipline / policy violation">Academic discipline / policy violation</option>
            <option value="Testing / demo student account cleanup">Testing / demo student account cleanup</option>
            <option value="Other">Other / Custom reason</option>
          </select>

          {reasonPreset === 'Other' && (
            <input
              type="text"
              placeholder="Specify the reason for account removal..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition mt-1.5"
            />
          )}
        </div>

        {/* Explicit Confirmation Input */}
        <div className="mb-6 space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Confirm by typing the student's email:{' '}
            <span className="text-cyan-400 font-mono select-all font-bold">{student.email}</span>
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder={`Type ${student.email} to confirm`}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className={`w-full px-3.5 py-2.5 bg-slate-900 border rounded-xl text-xs font-mono transition focus:outline-none ${
                isEmailConfirmed
                  ? 'border-emerald-500/60 text-emerald-300 focus:border-emerald-400'
                  : 'border-white/10 text-white focus:border-rose-500'
              }`}
            />
            {isEmailConfirmed && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500">
            <span>Case-insensitive verification</span>
            <button
              type="button"
              onClick={() => setConfirmEmail(student.email)}
              className="text-violet-400 hover:text-violet-300 transition underline cursor-pointer"
            >
              Fill exact email
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={!isEmailConfirmed || loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deactivating Account...</span>
              </>
            ) : (
              <>
                <UserX className="w-4 h-4" />
                <span>Remove Student Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

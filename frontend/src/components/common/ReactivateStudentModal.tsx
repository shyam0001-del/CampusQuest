import React, { useState } from 'react';
import { RotateCcw, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { User as UserType } from '../../types';
import { api } from '../../lib/api';

interface ReactivateStudentModalProps {
  isOpen: boolean;
  student: UserType | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ReactivateStudentModal: React.FC<ReactivateStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const studentId = student._id || student.id;

  const handleReactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.patch<{ success: boolean; message: string }>(
        `/users/${studentId}/reactivate`
      );

      if (res.success) {
        onSuccess(res.message);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate student account.');
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
      <div className="relative w-full max-w-md rounded-3xl bg-[#111726] border border-emerald-500/30 p-5 sm:p-7 shadow-2xl z-10">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              Account Restoration
            </span>
            <h3 className="text-lg font-extrabold text-white mt-0.5">
              Reactivate Student Account
            </h3>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Restore login access and academic privileges for{' '}
          <strong className="text-white">{student.name}</strong> ({student.email})?
        </p>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 text-[11px] text-slate-400 space-y-1 mb-5">
          <p>• Account status will be marked <strong>Active</strong>.</p>
          <p>• The student will be able to log in with their existing credentials.</p>
          <p>• Preserved points ({student.points || 0}) and coins ({student.coins || 0}) will be available again.</p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 transition disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReactivate}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 transition disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Reactivation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

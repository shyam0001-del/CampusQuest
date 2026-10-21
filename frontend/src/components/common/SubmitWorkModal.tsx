import React, { useState } from 'react';
import {
  Upload,
  Link as LinkIcon,
  FileText,
  X,
  Coins,
  AlertCircle,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Task } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CelebrationModal } from './CelebrationModal';

interface SubmitWorkModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitWorkModal: React.FC<SubmitWorkModalProps> = ({
  task,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'file' | 'url' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [textResponse, setTextResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Celebration modal state
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<any>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('taskId', task._id);
      formData.append('submissionType', activeTab);
      if (notes) formData.append('notes', notes);

      if (activeTab === 'file') {
        if (!file && !task.userSubmission?.fileUrl) {
          setError('Please select a file to upload');
          setSubmitting(false);
          return;
        }
        if (file) formData.append('file', file);
      } else if (activeTab === 'url') {
        if (!submissionUrl.trim()) {
          setError('Please enter a valid submission URL');
          setSubmitting(false);
          return;
        }
        formData.append('submissionUrl', submissionUrl.trim());
      } else if (activeTab === 'text') {
        if (!textResponse.trim()) {
          setError('Please enter your written response');
          setSubmitting(false);
          return;
        }
        formData.append('textResponse', textResponse.trim());
      }

      const res = await api.upload<{
        success: boolean;
        message: string;
        rewardResult: any;
      }>('/submissions/submit', formData);

      if (res.success) {
        await refreshUser();
        setCelebrationData(res.rewardResult);
        setShowCelebration(true);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit work. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    onClose();
  };

  return (
    <>
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

          {/* Header */}
          <div className="mb-6">
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-wider">
              {task.subject?.name || 'Academic Submission'}
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
              Submit: {task.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {task.instructions || task.description}
            </p>
          </div>

          {/* Early Bird Live Reward Banner */}
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-violet-500/10 border border-amber-500/30 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-amber-300">Early Submission Bonus Active!</p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Earn <span className="font-semibold text-white">+{task.bonusRules?.firstBonus || 50} coins</span> if you are the 1st submitter, or +{task.bonusRules?.secondBonus || 35} / +{task.bonusRules?.thirdBonus || 20} coins for 2nd & 3rd place!
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submission Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5 mb-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'file'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>File Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'url'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>External URL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'text'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Text / Code</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tab 1: File Upload */}
            {activeTab === 'file' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Upload Assignment File (PDF, DOCX, ZIP, Code)
                </label>
                <div className="border-2 border-dashed border-white/10 hover:border-violet-500/40 rounded-2xl p-6 text-center transition bg-slate-900/40 cursor-pointer">
                  <input
                    type="file"
                    id="fileUploadInput"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor="fileUploadInput" className="cursor-pointer block">
                    <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2 animate-bounce" />
                    {file ? (
                      <p className="text-xs font-bold text-violet-300 truncate max-w-xs mx-auto">
                        {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-300">
                          Click to browse or drag file here
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Max 25MB • Documents, PDF, ZIP archives, scripts
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: External Link */}
            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Public Project / Document / Slides URL
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://github.com/username/project or Google Drive link"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* Tab 3: Text Response */}
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Written Response / Explanation / Code
                </label>
                <textarea
                  rows={5}
                  value={textResponse}
                  onChange={(e) => setTextResponse(e.target.value)}
                  placeholder="Type or paste your solution, queries, or analysis here..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono text-xs"
                />
              </div>
            )}

            {/* Optional Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Additional Comments / Notes for Faculty (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Added extra unit tests for edge cases..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Coins className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Submit Task & Claim Coins</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Celebratory Receipt Modal on Success */}
      {showCelebration && celebrationData && (
        <CelebrationModal
          isOpen={showCelebration}
          onClose={handleCelebrationClose}
          taskTitle={task.title}
          rewardResult={celebrationData}
        />
      )}
    </>
  );
};

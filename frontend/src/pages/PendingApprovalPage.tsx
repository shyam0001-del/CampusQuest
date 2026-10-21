import React, { useState } from 'react';
import { Clock, ShieldAlert, RefreshCw, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PendingApprovalPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage(null);
    try {
      await refreshUser();
      if (user?.approvalStatus === 'approved') {
        navigate('/');
      } else if (user?.approvalStatus === 'rejected') {
        setStatusMessage('Your application was not approved. Reason: ' + (user.rejectionReason || 'Verification criteria not met.'));
      } else {
        setStatusMessage('Application status: Still Pending Administrator Review. Please check back shortly.');
      }
    } catch {
      setStatusMessage('Unable to connect to verification server.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500 selection:text-white">
      <div className="w-full max-w-lg rounded-3xl bg-[#111726] border border-amber-500/30 p-8 shadow-2xl text-center space-y-6 relative overflow-hidden z-10">

        {/* Luminous Clock / Verification Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 p-[2px] shadow-glow-gold">
          <div className="w-full h-full bg-[#0d121f] rounded-[22px] flex items-center justify-center">
            <Clock className="w-10 h-10 text-amber-400 animate-pulse-slow" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Faculty Verification Required</span>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            Application Under Review
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            Welcome, <strong>{user?.name}</strong>. Your faculty registration has been submitted and is currently in the department administrator approval queue.
          </p>
        </div>

        {/* Application Details Summary */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 text-left text-xs space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Faculty Member:</span>
            <span className="font-semibold text-slate-200">{user?.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Email Address:</span>
            <span className="font-semibold text-slate-200">{user?.email}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Department:</span>
            <span className="font-semibold text-slate-200">{user?.department}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Designation:</span>
            <span className="font-semibold text-slate-200">{user?.facultyDesignation || 'Faculty Member'}</span>
          </div>
          <div className="flex justify-between text-slate-400 pt-2 border-t border-white/5">
            <span>Status:</span>
            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PENDING APPROVAL
            </span>
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-amber-300">
            {statusMessage}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Approval Status</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full sm:w-auto py-3 px-5 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, LogIn, Sparkles, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'student' | 'admin') => {
    setError(null);
    setDemoLoading(role);

    try {
      await demoLogin(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0d17] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Tagline */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[2px] shadow-glow-violet inline-block">
            <div className="w-full h-full bg-[#0d121f] rounded-[14px] flex items-center justify-center">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Campus<span className="text-violet-400">Quest</span>
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to track coursework, earn coins, and top the leaderboard.
          </p>
        </div>

        {/* 1-Click Demo Login Panel */}
        <div className="p-4 rounded-3xl bg-gradient-to-b from-slate-900/90 to-[#111726] border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Instant Demo Preview Logins</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemoLogin('student')}
              className="p-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-left transition flex flex-col justify-between group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-violet-300 uppercase">Student Demo</span>
                <ArrowRight className="w-3.5 h-3.5 text-violet-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs font-bold text-white mt-1">Alex Rivera</p>
              <p className="text-[10px] text-slate-400">Rank #1 • 485 Coins</p>
            </button>

            <button
              type="button"
              disabled={!!demoLoading}
              onClick={() => handleDemoLogin('admin')}
              className="p-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-left transition flex flex-col justify-between group disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-300 uppercase">Faculty Demo</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs font-bold text-white mt-1">Dr. Sarah Chen</p>
              <p className="text-[10px] text-slate-400">Head of CSE Dept</p>
            </button>
          </div>
        </div>

        {/* Traditional Credentials Form */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#111726] border border-white/10 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">College Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@campusquest.edu"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="text-violet-400 font-bold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

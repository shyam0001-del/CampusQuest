import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar,
  Trophy,
  Award,
  User,
  ShieldAlert,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Calendar & Targets', path: '/calendar', icon: Calendar },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy, badge: 'Live' },
    { label: 'Achievements', path: '/achievements', icon: Award },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin Panel', path: '/admin', icon: ShieldAlert, badge: 'Admin' });
    navItems.push({ label: 'User Management', path: '/admin?tab=users', icon: UserCog, badge: 'Users' });
  } else if (user?.role === 'faculty') {
    navItems.push({ label: 'Faculty Hub', path: '/admin', icon: ShieldAlert, badge: 'Faculty' });
  }

  // Level XP progress math
  const currentXP = user?.xp || 0;
  const currentLevel = user?.level || 1;
  const nextLevelXP = Math.pow(currentLevel, 2) * 80;
  const prevLevelXP = Math.pow(currentLevel - 1, 2) * 80;
  const levelProgress = Math.min(
    100,
    Math.max(0, Math.round(((currentXP - prevLevelXP) / (nextLevelXP - prevLevelXP || 1)) * 100))
  );

  const isItemActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === path;
    }
    return location.pathname === path && (!location.search || location.search === '?tab=tasks');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-white/[0.08] bg-[#0c101d]/60 backdrop-blur-md p-4 min-h-[calc(100vh-4rem)] justify-between">
      {/* Navigation Links */}
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Quest Hub
        </div>
        {navItems.map((item) => {
          const active = isItemActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                active
                  ? 'bg-gradient-to-r from-violet-600/20 to-cyan-500/10 text-white border border-violet-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 transition-colors ${
                    active ? 'text-violet-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badge === 'Live'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : 'bg-violet-500/20 text-violet-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Gamification Level Card at bottom */}
      {user && user.role === 'student' && (
        <div className="mt-6 p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg relative overflow-hidden group">

          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-slate-200">Level {currentLevel}</span>
            </div>
            <span className="text-[10px] font-semibold text-violet-400">{currentXP} XP</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
            <div
              className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-glow-violet"
              style={{ width: `${levelProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Next: Level {currentLevel + 1}</span>
            <span>{levelProgress}%</span>
          </div>
        </div>
      )}
    </aside>
  );
};

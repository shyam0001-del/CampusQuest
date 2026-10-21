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
  UserCog,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Subjects', path: '/subjects', icon: BookOpen },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Badges', path: '/achievements', icon: Award },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin Panel', path: '/admin', icon: ShieldAlert });
    navItems.push({ label: 'User Management', path: '/admin?tab=users', icon: UserCog });
  } else if (user?.role === 'faculty') {
    navItems.push({ label: 'Faculty Hub', path: '/admin', icon: ShieldAlert });
  }

  const isItemActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === path;
    }
    return location.pathname === path && (!location.search || location.search === '?tab=tasks');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0c101d] border-r border-white/10 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-glow-violet text-xs">
                CQ
              </div>
              <span className="font-extrabold text-base text-white">CampusQuest</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isItemActive(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  end={item.path === '/'}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition min-h-[44px] ${
                    active
                      ? 'bg-violet-600/20 text-white border border-violet-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {user && (
          <div className="mt-6 pt-4 border-t border-white/5 p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400">
            <p className="font-semibold text-slate-200 truncate">{user.name}</p>
            <p className="text-[11px] truncate text-slate-400">{user.email}</p>
            <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-semibold uppercase text-[9px]">
              {user.role}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

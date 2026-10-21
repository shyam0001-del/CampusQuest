import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Calendar,
  Trophy,
  Award,
  User,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

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
    navItems.push({ label: 'Admin', path: '/admin', icon: ShieldAlert });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-[#0c101d] border-r border-white/10 p-5 shadow-2xl flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-400 flex items-center justify-center font-bold text-white shadow-glow-violet">
              CQ
            </div>
            <span className="font-extrabold text-base text-white">CampusQuest</span>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-violet-600/20 text-white border border-violet-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <item.icon className="w-4 h-4 text-violet-400" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {user && (
          <div className="p-3 rounded-xl bg-slate-900 border border-white/5 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">{user.name}</p>
            <p className="text-[11px] truncate">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
};

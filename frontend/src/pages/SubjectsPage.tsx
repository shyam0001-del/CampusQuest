import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Plus,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  Database,
  Cpu,
  Network,
  Globe,
  Code,
} from 'lucide-react';
import { Subject } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { CreateSubjectModal } from '../components/common/CreateSubjectModal';

export const SubjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects');
      if (res.success) {
        setSubjects(res.subjects);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.facultyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-violet-400" />
            <span>Academic Curriculum & Subjects</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic course modules, lecture syllabi, and assignment progression.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create Subject</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subjects by code, name, or faculty..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Subject Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-3xl bg-[#111726]/60 border border-white/10 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No courses created yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {user?.role === 'student'
              ? 'Instructors have not added courses to your department yet. Check back soon!'
              : 'Add your first subject to start enrolling students and creating assignments.'}
          </p>
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition"
            >
              + Create First Subject
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((subj) => (
            <Link
              key={subj._id}
              to={`/subjects/${subj._id}`}
              className="p-6 rounded-3xl bg-[#111726] border border-white/10 hover:border-violet-500/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 shadow-lg relative overflow-hidden"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="px-3 py-1 rounded-xl text-xs font-black text-white border shadow-sm"
                    style={{
                      backgroundColor: `${subj.color || '#8b5cf6'}25`,
                      borderColor: `${subj.color || '#8b5cf6'}60`,
                    }}
                  >
                    {subj.code}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {subj.semester}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition line-clamp-1">
                  {subj.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {subj.description || 'Coursework module for current academic period.'}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate max-w-[150px]">👤 {subj.facultyName}</span>
                  <span className="flex items-center gap-1 text-slate-300 font-semibold">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {subj.totalEnrolled || 6} Enrolled
                  </span>
                </div>
              </div>

              {/* Progress Bar & Footer */}
              <div className="mt-6 pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tasks Completed</span>
                  <span className="font-bold text-white">
                    {subj.completedTasks || 0} / {subj.totalTasks || 0} ({subj.progressPercentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{
                      width: `${subj.progressPercentage || 0}%`,
                      backgroundColor: subj.color || '#8b5cf6',
                    }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      <CreateSubjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchSubjects()}
      />
    </div>
  );
};

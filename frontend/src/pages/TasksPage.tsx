import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { Task, Subject } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getCategoryBadge } from '../lib/utils';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { SubmitWorkModal } from '../components/common/SubmitWorkModal';
import { CreateTaskModal } from '../components/common/CreateTaskModal';

export const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const statusFilter = searchParams.get('filter') || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  const subjectFilter = searchParams.get('subject') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || 'deadline';

  // Modals state
  const [selectedTaskForSubmit, setSelectedTaskForSubmit] = useState<Task | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [searchParams, user]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects');
      if (res.success) setSubjects(res.subjects);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('filter', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (subjectFilter !== 'all') params.set('subject', subjectFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sortBy', sortBy);

      const res = await api.get<{ success: boolean; tasks: Task[] }>(`/tasks?${params.toString()}`);
      if (res.success) {
        setTasks(res.tasks);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all' || !value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const statusTabs = [
    { label: 'All Tasks', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Due This Week', value: 'due_this_week' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-6 h-6 text-violet-400" />
            <span>Academic Tasks & Submissions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete assignments, lab records, presentations, and projects to earn gold coins.
          </p>
        </div>

        {user?.role === 'admin' && (
          <button
            onClick={() => setIsCreateTaskOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Task</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Row */}
      <div className="space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParam('filter', tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === tab.value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateParam('search', e.target.value)}
              placeholder="Search by task title, instructions, topics..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => updateParam('category', e.target.value)}
              className="flex-1 md:w-44 px-3 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Categories</option>
              <option value="assignment">Assignments</option>
              <option value="lab_activity">Lab Activities</option>
              <option value="presentation">Presentations</option>
              <option value="practical_record">Practical Records</option>
              <option value="project">Course Projects</option>
            </select>

            {/* Subject Dropdown */}
            <select
              value={subjectFilter}
              onChange={(e) => updateParam('subject', e.target.value)}
              className="flex-1 md:w-48 px-3 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code}: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-[#111726]/60 border border-white/10 p-8 space-y-3">
          <CheckSquare className="w-12 h-12 text-slate-500 mx-auto" />
          {statusFilter === 'all' && categoryFilter === 'all' && subjectFilter === 'all' && !searchQuery ? (
            <>
              <h3 className="text-base font-bold text-white">No tasks published yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {user?.role === 'admin' || user?.role === 'faculty'
                  ? 'Get started by publishing assignments, lab activities, or presentations for your students.'
                  : 'Instructors have not posted coursework yet. Check back soon!'}
              </p>
              {(user?.role === 'admin' || user?.role === 'faculty') && (
                <button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="mt-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet transition"
                >
                  + Publish First Task
                </button>
              )}
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-white">No tasks matching your filters</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try resetting your status or category filters to explore other academic assignments.
              </p>
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition"
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const badge = getCategoryBadge(task.category);
            const isSubmitted = !!task.userSubmission;

            return (
              <div
                key={task._id}
                className="group p-5 rounded-3xl bg-[#111726] border border-white/10 hover:border-violet-500/40 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 shadow-lg"
              >
                <div>
                  {/* Card Header: Subject Code & Category */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: `${task.subject?.color || '#8b5cf6'}30`,
                        borderColor: task.subject?.color || '#8b5cf6',
                      }}
                    >
                      {task.subject?.code}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Title */}
                  <Link
                    to={`/tasks/${task._id}`}
                    className="text-sm font-bold text-white group-hover:text-violet-400 transition line-clamp-2"
                  >
                    {task.title}
                  </Link>

                  {/* Instructions snippet */}
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                    {task.instructions || task.description}
                  </p>

                  {/* Early Bird Bonus Banner */}
                  <div className="mt-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold">{task.maxBasePoints} Coins</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-400">
                      +{task.bonusRules?.firstBonus || 50} 1st Podium
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between gap-2">
                  <CountdownTimer deadline={task.deadline} isSubmitted={isSubmitted} />

                  <div className="flex items-center gap-2">
                    {user?.role === 'student' && !isSubmitted && (
                      <button
                        onClick={() => setSelectedTaskForSubmit(task)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition"
                      >
                        Submit
                      </button>
                    )}
                    <Link
                      to={`/tasks/${task._id}`}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 transition"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Work Modal */}
      {selectedTaskForSubmit && (
        <SubmitWorkModal
          task={selectedTaskForSubmit}
          isOpen={!!selectedTaskForSubmit}
          onClose={() => setSelectedTaskForSubmit(null)}
          onSuccess={() => {
            fetchTasks();
            setSelectedTaskForSubmit(null);
          }}
        />
      )}

      {/* Admin Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={() => fetchTasks()}
      />
    </div>
  );
};

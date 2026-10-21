import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Users,
  CheckSquare,
  Plus,
  Clock,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Subject, Task } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { getCategoryBadge } from '../lib/utils';
import { CountdownTimer } from '../components/common/CountdownTimer';
import { CreateTaskModal } from '../components/common/CreateTaskModal';

export const SubjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categoriesCount, setCategoriesCount] = useState<any>({});
  const [studentSubmissions, setStudentSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  useEffect(() => {
    fetchSubjectDetails();
  }, [id]);

  const fetchSubjectDetails = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        subject: Subject;
        tasks: Task[];
        categoriesCount: any;
        studentSubmissions: Record<string, any>;
      }>(`/subjects/${id}`);

      if (res.success) {
        setSubject(res.subject);
        setTasks(res.tasks);
        setCategoriesCount(res.categoriesCount || {});
        setStudentSubmissions(res.studentSubmissions || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="text-center py-16">
        <p className="text-white">Subject not found</p>
        <Link to="/subjects" className="text-violet-400 text-xs">
          Back to subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Back button */}
      <Link
        to="/subjects"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subjects Catalog</span>
      </Link>

      {/* Header Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${subject.color || '#8b5cf6'}20 0%, #111726 60%, #0c101d 100%)`,
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-xl text-xs font-black text-white border"
                style={{
                  backgroundColor: `${subject.color || '#8b5cf6'}30`,
                  borderColor: subject.color || '#8b5cf6',
                }}
              >
                {subject.code}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {subject.semester} • {subject.academicYear}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {subject.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {subject.description || 'Core university coursework and practical lab syllabus.'}
            </p>
            <div className="pt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>Faculty: <strong className="text-slate-200">{subject.facultyName}</strong></span>
              <span>Enrolled: <strong className="text-slate-200">{subject.enrolledStudents?.length || 6} students</strong></span>
            </div>
          </div>

          {user?.role === 'admin' && (
            <button
              onClick={() => setIsCreateTaskOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Task to Subject</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Count Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 text-center">
          <p className="text-xs text-slate-400 font-semibold">Assignments</p>
          <p className="text-xl font-bold text-white mt-1">{categoriesCount.assignment || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 text-center">
          <p className="text-xs text-slate-400 font-semibold">Lab Activities</p>
          <p className="text-xl font-bold text-white mt-1">{categoriesCount.lab_activity || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 text-center">
          <p className="text-xs text-slate-400 font-semibold">Presentations</p>
          <p className="text-xl font-bold text-white mt-1">{categoriesCount.presentation || 0}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 text-center">
          <p className="text-xs text-slate-400 font-semibold">Projects</p>
          <p className="text-xl font-bold text-white mt-1">{categoriesCount.project || 0}</p>
        </div>
      </div>

      {/* Course Tasks List */}
      <div className="p-6 rounded-3xl bg-[#111726] border border-white/10 shadow-lg space-y-4">
        <h3 className="font-bold text-base text-white">Course Tasks & Assignments ({tasks.length})</h3>

        {tasks.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No tasks published for this course yet.
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {tasks.map((task) => {
              const badge = getCategoryBadge(task.category);
              const isSubmitted = !!studentSubmissions[task._id];

              return (
                <div
                  key={task._id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {badge.label}
                    </span>
                    <div>
                      <Link
                        to={`/tasks/${task._id}`}
                        className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition"
                      >
                        {task.title}
                      </Link>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {task.instructions || task.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                    <CountdownTimer deadline={task.deadline} isSubmitted={isSubmitted} />
                    <Link
                      to={`/tasks/${task._id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-violet-600 text-slate-200 hover:text-white border border-white/10 transition"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={() => fetchSubjectDetails()}
        defaultSubjectId={subject._id}
      />
    </div>
  );
};

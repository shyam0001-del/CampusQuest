import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BookOpen,
  CheckSquare,
  Users,
  Upload,
  Plus,
  Trash2,
  Archive,
  Download,
  Activity,
  Search,
} from 'lucide-react';
import { api } from '../lib/api';
import { Subject, Task, User as UserType } from '../types';
import { CreateSubjectModal } from '../components/common/CreateSubjectModal';
import { CreateTaskModal } from '../components/common/CreateTaskModal';
import { AddStudentModal } from '../components/common/AddStudentModal';

export const AdminPanelPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'subjects' | 'students' | 'audit'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, [activeTab]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tasks') {
        const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks?status=all');
        if (res.success) setTasks(res.tasks);
      } else if (activeTab === 'subjects') {
        const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects?includeArchived=true');
        if (res.success) setSubjects(res.subjects);
      } else if (activeTab === 'students') {
        const res = await api.get<{ success: boolean; students: UserType[] }>('/users/students');
        if (res.success) setStudents(res.students);
      } else if (activeTab === 'audit') {
        const res = await api.get<{ success: boolean; logs: any[] }>('/users/audit-logs');
        if (res.success) setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchiveSubject = async (subjectId: string) => {
    try {
      await api.patch(`/subjects/${subjectId}/archive`);
      loadAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task and all its student submissions?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        loadAllAdminData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">Faculty & Administration Hub</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic course management, task publication, student directory roster, and administrative audit trails.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'tasks' && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Task</span>
            </button>
          )}
          {activeTab === 'subjects' && (
            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Subject</span>
            </button>
          )}
          {activeTab === 'students' && (
            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Enroll Students</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'tasks' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks & Roster</span>
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'subjects' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects Curriculum</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'students' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'audit' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Tab 1: Tasks Table */}
      {activeTab === 'tasks' && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4">Task Title</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Deadline</th>
                  <th className="p-4 text-center">Submissions</th>
                  <th className="p-4 text-center">Bonus Economy</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-bold text-white max-w-xs truncate">{task.title}</td>
                    <td className="p-4 text-slate-400">{task.subject?.code}</td>
                    <td className="p-4 text-slate-300 capitalize">{task.category.replace('_', ' ')}</td>
                    <td className="p-4 text-slate-400">{new Date(task.deadline).toLocaleDateString()}</td>
                    <td className="p-4 text-center font-bold text-cyan-400">{task.submissionCount} turned in</td>
                    <td className="p-4 text-center font-semibold text-amber-400">
                      +{task.bonusRules?.firstBonus || 50} 🥇 / +{task.bonusRules?.secondBonus || 35} 🥈
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <a
                        href={`/api/tasks/${task._id}/export-csv`}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3 text-violet-400" />
                        <span>CSV</span>
                      </a>
                      <button
                        onClick={() => handleDeleteTask(task._id)}
                        className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-400"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Subjects Table */}
      {activeTab === 'subjects' && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4">Code</th>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4">Faculty In-Charge</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subjects.map((subj) => (
                  <tr key={subj._id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-violet-400">{subj.code}</td>
                    <td className="p-4 font-bold text-white">{subj.name}</td>
                    <td className="p-4 text-slate-400">{subj.semester}</td>
                    <td className="p-4 text-slate-300">{subj.facultyName}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          subj.isArchived
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}
                      >
                        {subj.isArchived ? 'ARCHIVED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleArchiveSubject(subj._id)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold"
                      >
                        {subj.isArchived ? 'Restore' : 'Archive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Student Directory */}
      {activeTab === 'students' && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                <tr>
                  <th className="p-4">Roll Number</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department & Section</th>
                  <th className="p-4 text-center">Level</th>
                  <th className="p-4 text-right">Coins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-mono font-bold text-slate-300">{st.rollNumber}</td>
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <img
                        src={st.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${st.name}`}
                        alt={st.name}
                        className="w-6 h-6 rounded-md bg-violet-950"
                      />
                      <span>{st.name}</span>
                    </td>
                    <td className="p-4 text-slate-400">{st.email}</td>
                    <td className="p-4 text-slate-400">
                      {st.department} • {st.section}
                    </td>
                    <td className="p-4 text-center font-bold text-violet-400">Level {st.level}</td>
                    <td className="p-4 text-right font-black text-amber-400">{st.coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden p-4">
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div
                key={log._id}
                className="p-3 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-violet-400">{log.action}</span>
                  <span className="text-slate-400 ml-2">
                    by <strong>{log.performedBy?.name || 'Admin'}</strong> on {log.targetType}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => loadAllAdminData()}
      />
      <CreateSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSuccess={() => loadAllAdminData()}
      />
      <AddStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={() => loadAllAdminData()}
      />
    </div>
  );
};

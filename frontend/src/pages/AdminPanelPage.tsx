import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCog,
  Search,
  Filter,
  Shield,
  Clock,
  GraduationCap,
  RefreshCw,
  UserX,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { api } from '../lib/api';
import { Subject, Task, User as UserType } from '../types';
import { CreateSubjectModal } from '../components/common/CreateSubjectModal';
import { CreateTaskModal } from '../components/common/CreateTaskModal';
import { AddStudentModal } from '../components/common/AddStudentModal';
import { RemoveStudentModal } from '../components/common/RemoveStudentModal';
import { ReactivateStudentModal } from '../components/common/ReactivateStudentModal';

type AdminTab = 'users' | 'faculty' | 'tasks' | 'subjects' | 'students' | 'audit';

export const AdminPanelPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as AdminTab | null;

  const [activeTab, setActiveTab] = useState<AdminTab>(
    tabParam && ['users', 'faculty', 'tasks', 'subjects', 'students', 'audit'].includes(tabParam)
      ? tabParam
      : 'users'
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [pendingFaculty, setPendingFaculty] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Registered Users (Atlas DB) State
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userAccountStatusFilter, setUserAccountStatusFilter] = useState<string>('all');

  // Student Removal & Reactivation State
  const [studentToRemove, setStudentToRemove] = useState<UserType | null>(null);
  const [studentToReactivate, setStudentToReactivate] = useState<UserType | null>(null);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Sync tab with URL search param
  useEffect(() => {
    if (tabParam && ['users', 'faculty', 'tasks', 'subjects', 'students', 'audit'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    loadAllAdminData();
    fetchPendingCount();
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await api.get<{ success: boolean; users: UserType[]; total: number }>('/users');
      if (res.success && Array.isArray(res.users)) {
        setAllUsers(res.users);
      } else {
        setAllUsers([]);
      }
    } catch (err: any) {
      console.error('Error fetching registered users:', err);
      setUsersError(err.message || 'Failed to fetch registered users from database.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.get<{ success: boolean; count: number; pendingFaculty: any[] }>('/auth/faculty/pending');
      if (res.success) {
        setPendingFaculty(res.pendingFaculty);
      }
    } catch {
      // Quiet fail if not admin
    }
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      if (activeTab === 'users') {
        await fetchUsers();
      } else if (activeTab === 'tasks') {
        const res = await api.get<{ success: boolean; tasks: Task[] }>('/tasks?status=all');
        if (res.success) setTasks(res.tasks);
      } else if (activeTab === 'subjects') {
        const res = await api.get<{ success: boolean; subjects: Subject[] }>('/subjects?includeArchived=true');
        if (res.success) setSubjects(res.subjects);
      } else if (activeTab === 'students') {
        const res = await api.get<{ success: boolean; students: UserType[] }>('/users/students');
        if (res.success) setStudents(res.students);
      } else if (activeTab === 'faculty') {
        const res = await api.get<{ success: boolean; pendingFaculty: any[] }>('/auth/faculty/pending');
        if (res.success) setPendingFaculty(res.pendingFaculty);
      } else if (activeTab === 'audit') {
        const res = await api.get<{ success: boolean; logs: any[] }>('/users/audit-logs');
        if (res.success) setAuditLogs(res.logs);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveFaculty = async (facultyId: string, name: string) => {
    try {
      const res = await api.patch<{ success: boolean; message: string }>(`/auth/faculty/${facultyId}/approve`);
      if (res.success) {
        setActionMessage(`✓ Approved faculty privileges for ${name}.`);
        loadAllAdminData();
        fetchPendingCount();
      }
    } catch (err: any) {
      alert(err.message || 'Error approving faculty member');
    }
  };

  const handleRejectFaculty = async (facultyId: string, name: string) => {
    const reason = prompt(`Enter reason for rejecting ${name}'s application (optional):`);
    try {
      const res = await api.patch<{ success: boolean; message: string }>(`/auth/faculty/${facultyId}/reject`, {
        reason: reason || undefined,
      });
      if (res.success) {
        setActionMessage(`✓ Application for ${name} rejected.`);
        loadAllAdminData();
        fetchPendingCount();
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting faculty applicant');
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

  // Duplicate roll numbers and names lookup
  const rollCounts: Record<string, number> = {};
  const nameCounts: Record<string, number> = {};
  allUsers.forEach((u) => {
    if (u.role === 'student' && u.isActive !== false) {
      if (u.rollNumber?.trim()) {
        const roll = u.rollNumber.trim().toUpperCase();
        rollCounts[roll] = (rollCounts[roll] || 0) + 1;
      }
      if (u.name?.trim()) {
        const nm = u.name.trim().toLowerCase();
        nameCounts[nm] = (nameCounts[nm] || 0) + 1;
      }
    }
  });

  const isDuplicateStudent = (u: UserType) => {
    if (u.role !== 'student') return false;
    const roll = u.rollNumber?.trim().toUpperCase();
    const nm = u.name?.trim().toLowerCase();
    return Boolean((roll && rollCounts[roll] > 1) || (nm && nameCounts[nm] > 1));
  };

  const getDuplicatesFor = (target: UserType) => {
    if (target.role !== 'student') return [];
    const targetId = target._id || target.id;
    const roll = target.rollNumber?.trim().toUpperCase();
    const nm = target.name?.trim().toLowerCase();
    return allUsers.filter(
      (u) =>
        u.role === 'student' &&
        (u._id || u.id) !== targetId &&
        ((roll && u.rollNumber?.trim().toUpperCase() === roll) ||
          (nm && u.name?.trim().toLowerCase() === nm))
    );
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      !userSearchTerm.trim() ||
      u.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.rollNumber?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.department?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.facultyDesignation?.toLowerCase().includes(userSearchTerm.toLowerCase());

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || u.approvalStatus === userStatusFilter;

    let matchesAccountStatus = true;
    if (userAccountStatusFilter === 'active') {
      matchesAccountStatus = u.isActive !== false;
    } else if (userAccountStatusFilter === 'deactivated') {
      matchesAccountStatus = u.isActive === false;
    } else if (userAccountStatusFilter === 'duplicate') {
      matchesAccountStatus = isDuplicateStudent(u);
    }

    return matchesSearch && matchesRole && matchesStatus && matchesAccountStatus;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">Academic Administration</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Faculty approvals, registered user accounts, course publication controls, student enrollment rosters, and audit trails.
          </p>
        </div>

        {/* Action Button depending on tab */}
        <div className="flex items-center gap-2">
          {activeTab === 'users' && (
            <button
              onClick={fetchUsers}
              disabled={usersLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-glow-violet hover:opacity-95 transition flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Atlas Users</span>
            </button>
          )}
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

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          onClick={() => handleTabChange('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'users' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCog className="w-4 h-4 text-violet-300" />
          <span>User Management</span>
          {allUsers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-violet-400/20 text-violet-200">
              {allUsers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('faculty')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'faculty' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Faculty Approvals</span>
          {pendingFaculty.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
              {pendingFaculty.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'tasks' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>Tasks & Roster</span>
        </button>

        <button
          onClick={() => handleTabChange('subjects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'subjects' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subjects Curriculum</span>
        </button>

        <button
          onClick={() => handleTabChange('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'students' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory</span>
        </button>

        <button
          onClick={() => handleTabChange('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition shrink-0 ${
            activeTab === 'audit' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Tab: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Action Success / Feedback Banner */}
          {actionMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{actionMessage}</span>
              </div>
              <button
                onClick={() => setActionMessage(null)}
                className="p-1 text-emerald-400 hover:text-white rounded-lg transition"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Top summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#111726] border border-white/10">
              <span className="text-[11px] text-slate-400 font-medium">Total Registered</span>
              <p className="text-xl font-black text-white mt-1">{allUsers.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111726] border border-white/10">
              <span className="text-[11px] text-cyan-400 font-medium">Active Students</span>
              <p className="text-xl font-black text-cyan-300 mt-1">
                {allUsers.filter((u) => u.role === 'student' && u.isActive !== false).length}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111726] border border-white/10">
              <span className="text-[11px] text-rose-400 font-medium">Deactivated</span>
              <p className="text-xl font-black text-rose-300 mt-1">
                {allUsers.filter((u) => u.role === 'student' && u.isActive === false).length}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111726] border border-white/10">
              <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>Possible Duplicates</span>
              </span>
              <p className="text-xl font-black text-amber-300 mt-1">
                {allUsers.filter(isDuplicateStudent).length}
              </p>
            </div>
          </div>

          {/* Controls: Search, Role Filter, Status Filter, Account Status Filter, Refresh */}
          <div className="p-4 rounded-2xl bg-[#111726] border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search registered users by name, email, roll number, or department..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-[125px] sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-400">Role:</span>
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">All Roles</option>
                  <option value="student" className="bg-slate-900 text-white">Student</option>
                  <option value="faculty" className="bg-slate-900 text-white">Faculty</option>
                  <option value="admin" className="bg-slate-900 text-white">Admin</option>
                </select>
              </div>

              <div className="flex-1 min-w-[125px] sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">Approval:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">All Approvals</option>
                  <option value="approved" className="bg-slate-900 text-white">Approved</option>
                  <option value="pending" className="bg-slate-900 text-white">Pending</option>
                  <option value="rejected" className="bg-slate-900 text-white">Rejected</option>
                </select>
              </div>

              <div className="flex-1 min-w-[125px] sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 bg-slate-900/80 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
                <span className="text-[11px] text-slate-400">Account:</span>
                <select
                  value={userAccountStatusFilter}
                  onChange={(e) => setUserAccountStatusFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">All Accounts</option>
                  <option value="active" className="bg-slate-900 text-white">Active Only</option>
                  <option value="deactivated" className="bg-slate-900 text-white">Deactivated Only</option>
                  <option value="duplicate" className="bg-slate-900 text-white">Possible Duplicates</option>
                </select>
              </div>

              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                aria-label="Refresh users"
                title="Refresh user list from MongoDB Atlas"
                className="p-2 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin text-violet-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {usersError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{usersError}</span>
              </div>
              <button
                onClick={fetchUsers}
                className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {usersLoading && (
            <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-violet-400 mx-auto animate-spin" />
              <h3 className="font-bold text-white text-sm">Querying MongoDB Atlas Database...</h3>
              <p className="text-xs text-slate-400">Loading registered users securely with sanitized credentials.</p>
            </div>
          )}

          {/* Empty State */}
          {!usersLoading && !usersError && filteredUsers.length === 0 && (
            <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-500 mx-auto" />
              <h3 className="font-bold text-white text-sm">No Registered Users Found</h3>
              <p className="text-xs text-slate-400">
                {userSearchTerm || userRoleFilter !== 'all' || userStatusFilter !== 'all' || userAccountStatusFilter !== 'all'
                  ? 'No users match your active filter criteria. Try clearing search filters.'
                  : 'No user records currently exist in the database.'}
              </p>
            </div>
          )}

          {/* Data Table */}
          {!usersLoading && !usersError && filteredUsers.length > 0 && (
            <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Approval</th>
                      <th className="p-4">Account State</th>
                      <th className="p-4">Department / Details</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => {
                      const regDate = u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A';

                      const isDuplicate = isDuplicateStudent(u);
                      const isDeactivated = u.isActive === false;

                      return (
                        <tr
                          key={u._id || u.id}
                          className={`hover:bg-white/[0.02] transition ${
                            isDeactivated ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.name}`}
                                alt={u.name}
                                className="w-8 h-8 rounded-xl bg-violet-500/10 border border-white/10 object-cover"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white block">{u.name}</span>
                                  {isDuplicate && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                      title="Another student shares this roll number or name"
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Duplicate Match
                                    </span>
                                  )}
                                </div>
                                {u.role === 'student' && u.rollNumber && (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    Roll: {u.rollNumber}
                                  </span>
                                )}
                                {u.role === 'faculty' && u.facultyDesignation && (
                                  <span className="text-[11px] text-purple-300">
                                    {u.facultyDesignation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-300 font-mono text-[11px]">{u.email}</td>
                          <td className="p-4">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                <Shield className="w-3 h-3 text-amber-400" />
                                Administrator
                              </span>
                            ) : u.role === 'faculty' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                                <GraduationCap className="w-3 h-3 text-purple-400" />
                                Faculty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                                <Users className="w-3 h-3 text-cyan-400" />
                                Student
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {u.approvalStatus === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" />
                                Approved
                              </span>
                            ) : u.approvalStatus === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse">
                                <Clock className="w-3 h-3" />
                                Pending Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                                <XCircle className="w-3 h-3" />
                                Rejected
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            {isDeactivated ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300"
                                title={u.deactivationReason || 'Deactivated by administrator'}
                              >
                                <UserX className="w-3 h-3" />
                                Deactivated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 text-[11px]">
                            {u.department ? (
                              <span>
                                {u.department} {u.year ? `(${u.year})` : ''} {u.section ? `- Sec ${u.section}` : ''}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">None specified</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {regDate}
                          </td>
                          <td className="p-4 text-right">
                            {u.role === 'student' ? (
                              !isDeactivated ? (
                                <button
                                  onClick={() => setStudentToRemove(u)}
                                  className="px-2.5 py-1.5 rounded-xl font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition inline-flex items-center gap-1.5 text-xs shadow-sm hover:shadow"
                                  title={`Safely remove student ${u.name}`}
                                >
                                  <UserX className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Remove</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => setStudentToReactivate(u)}
                                  className="px-2.5 py-1.5 rounded-xl font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition inline-flex items-center gap-1.5 text-xs shadow-sm hover:shadow"
                                  title={`Reactivate student ${u.name}`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Restore</span>
                                </button>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-500 inline-flex items-center gap-1 font-medium">
                                <Shield className="w-3 h-3 text-slate-500" />
                                Protected
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Security & Audit Notice */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-white/5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Account Security: Passwords and tokens are never exposed. Student removal performs reversible deactivation while protecting academic submissions and financial ledger history.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Faculty Approvals Queue */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Pending faculty applicants cannot publish coursework, create subjects, or access student grades until verified by an authorized administrator.
            </span>
          </div>

          <div className="rounded-3xl bg-[#111726] border border-white/10 shadow-xl overflow-hidden">
            {pendingFaculty.length === 0 ? (
              <div className="text-center py-16 p-8 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="font-bold text-white text-sm">No Pending Faculty Applications</h3>
                <p className="text-xs text-slate-400">All faculty registrations have been reviewed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-white/5">
                    <tr>
                      <th className="p-4">Faculty Member</th>
                      <th className="p-4">Institutional Email</th>
                      <th className="p-4">Department & Designation</th>
                      <th className="p-4">Application Date</th>
                      <th className="p-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingFaculty.map((fac) => (
                      <tr key={fac._id} className="hover:bg-white/[0.02]">
                        <td className="p-4 font-bold text-white flex items-center gap-2.5">
                          <img
                            src={fac.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${fac.name}`}
                            alt={fac.name}
                            className="w-8 h-8 rounded-xl object-cover bg-violet-950"
                          />
                          <span>{fac.name}</span>
                        </td>
                        <td className="p-4 text-slate-300 font-mono">{fac.email}</td>
                        <td className="p-4 text-slate-300">
                          <p className="font-semibold text-slate-200">{fac.facultyDesignation || 'Faculty Member'}</p>
                          <p className="text-[10px] text-slate-400">{fac.department}</p>
                        </td>
                        <td className="p-4 text-slate-400">
                          {new Date(fac.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleApproveFaculty(fac._id, fac.name)}
                            className="px-3 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition inline-flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectFaculty(fac._id, fac.name)}
                            className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition inline-flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Tasks Table */}
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

      {/* Tab: Subjects Table */}
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

      {/* Tab: Student Directory */}
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

      {/* Tab: Audit Logs */}
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
      <RemoveStudentModal
        isOpen={Boolean(studentToRemove)}
        student={studentToRemove}
        potentialDuplicates={studentToRemove ? getDuplicatesFor(studentToRemove) : []}
        onClose={() => setStudentToRemove(null)}
        onSuccess={(msg) => {
          setActionMessage(msg);
          fetchUsers();
        }}
      />
      <ReactivateStudentModal
        isOpen={Boolean(studentToReactivate)}
        student={studentToReactivate}
        onClose={() => setStudentToReactivate(null)}
        onSuccess={(msg) => {
          setActionMessage(msg);
          fetchUsers();
        }}
      />
    </div>
  );
};

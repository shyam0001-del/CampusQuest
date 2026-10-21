export type UserRole = 'student' | 'faculty' | 'admin';
export type ApprovalStatus = 'approved' | 'pending' | 'rejected';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  facultyDesignation?: string;
  rejectionReason?: string;
  avatar: string;
  rollNumber: string;
  department: string;
  year: string;
  section: string;
  coins: number;
  points: number;
  xp: number;
  level: number;
  streak: number;
  targetWeeklyTasks: number;
  targetCoinGoal: number;
  rank?: number | null;
  isActive?: boolean;
  deactivatedAt?: string;
  deactivationReason?: string;
  deactivatedBy?: { name: string; email: string };
  createdAt?: string;
}

export type TaskCategory =
  | 'assignment'
  | 'lab_activity'
  | 'presentation'
  | 'practical_record'
  | 'project'
  | 'other';

export interface TaskBonusRules {
  firstBonus: number;
  secondBonus: number;
  thirdBonus: number;
  latePenaltyPct: number;
}

export interface TaskAttachment {
  name: string;
  url: string;
  size?: number;
}

export interface Subject {
  _id: string;
  name: string;
  code: string;
  description: string;
  semester: string;
  academicYear: string;
  facultyName: string;
  color: string;
  icon: string;
  isArchived: boolean;
  totalTasks?: number;
  completedTasks?: number;
  progressPercentage?: number;
  totalEnrolled?: number;
  enrolledStudents?: User[];
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  subject: Subject;
  category: TaskCategory;
  deadline: string;
  maxBasePoints: number;
  bonusRules: TaskBonusRules;
  attachments?: TaskAttachment[];
  allowedSubmissionTypes: ('file' | 'url' | 'text')[];
  allowResubmission: boolean;
  status: 'draft' | 'published' | 'closed' | 'archived';
  submissionCount: number;
  userSubmission?: Submission | null;
  userStatus?: 'submitted' | 'late' | 'overdue' | 'pending';
  isDueToday?: boolean;
  isDueThisWeek?: boolean;
  createdAt: string;
}

export interface Submission {
  _id: string;
  task: string | Task;
  student: string | User;
  subject: string | Subject;
  submissionType: 'file' | 'url' | 'text';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  submissionUrl?: string;
  textResponse?: string;
  notes?: string;
  status: 'submitted' | 'late' | 'revision_requested' | 'graded';
  submittedAt: string;
  isLate: boolean;
  rewardCoins: number;
  rewardPoints: number;
  bonusRankAwarded?: 1 | 2 | 3 | null;
  feedback?: string;
}

export interface CoinTransaction {
  id: string;
  type: string;
  title: string;
  amount: number;
  timestamp: string;
}

export interface Achievement {
  _id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: 'submission' | 'streak' | 'coins' | 'special';
  xpReward: number;
  coinReward: number;
  isUnlocked?: boolean;
  unlockedAt?: string | null;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'task_published' | 'reward_earned' | 'deadline_warning' | 'rank_change' | 'achievement_unlocked' | 'general';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface LeaderboardUser extends User {
  _id: string;
  rank: number;
  tasksCompleted: number;
  earlyBirdBonuses: number;
  leaderboardPoints: number;
  leaderboardCoins: number;
}

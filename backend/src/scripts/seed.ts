import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { Task } from '../models/Task';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { Achievement, UserAchievement } from '../models/Achievement';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

export const seedDatabase = async (): Promise<void> => {
  try {
    if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-production-seed')) {
      console.error('⛔ [SAFETY ABORT] Seed script execution is blocked in production to protect real university data.');
      console.error('   CampusQuest production database must start clean.');
      process.exit(1);
    }

    await connectDB();
    console.log('[Seed] Connected to database. Clearing existing collections...');

    await Promise.all([
      User.deleteMany({}),
      Subject.deleteMany({}),
      Task.deleteMany({}),
      Submission.deleteMany({}),
      CoinTransaction.deleteMany({}),
      Achievement.deleteMany({}),
      UserAchievement.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed] Collections cleared. Creating standard achievements...');

    const achievementsList = [
      {
        slug: 'first_submission',
        title: 'Trailblazer',
        description: 'Submitted your very first academic task on CampusQuest',
        icon: 'Rocket',
        category: 'submission' as const,
        xpReward: 50,
        coinReward: 25,
      },
      {
        slug: 'early_bird',
        title: 'Early Bird Champion',
        description: 'Earned 1st place early-submission bonus on an academic task',
        icon: 'Zap',
        category: 'special' as const,
        xpReward: 100,
        coinReward: 50,
      },
      {
        slug: 'podium_finisher',
        title: 'Podium Finisher',
        description: 'Submitted among the top 3 earliest students for an assignment',
        icon: 'Trophy',
        category: 'special' as const,
        xpReward: 75,
        coinReward: 35,
      },
      {
        slug: 'consistency_champion',
        title: 'Consistency Champion',
        description: 'Maintained an unbroken 3-day academic submission streak',
        icon: 'Flame',
        category: 'streak' as const,
        xpReward: 120,
        coinReward: 60,
      },
      {
        slug: 'unstoppable_streak',
        title: 'Unstoppable Momentum',
        description: 'Achieved a stellar 7-day submission streak',
        icon: 'Crown',
        category: 'streak' as const,
        xpReward: 250,
        coinReward: 150,
      },
      {
        slug: 'assignment_finisher',
        title: 'Assignment Finisher',
        description: 'Completed 5 university assignments with verified submissions',
        icon: 'BookCheck',
        category: 'submission' as const,
        xpReward: 150,
        coinReward: 75,
      },
      {
        slug: 'lab_master',
        title: 'Lab Alchemist',
        description: 'Completed 3 hands-on practical lab experiments',
        icon: 'FlaskConical',
        category: 'submission' as const,
        xpReward: 120,
        coinReward: 60,
      },
      {
        slug: 'presentation_pro',
        title: 'Keynote Speaker',
        description: 'Uploaded 2 slide presentations & seminar decks',
        icon: 'Presentation',
        category: 'submission' as const,
        xpReward: 100,
        coinReward: 50,
      },
      {
        slug: 'coin_tycoon',
        title: 'Gold Tycoon',
        description: 'Accumulated over 500 lifetime CampusQuest gold coins',
        icon: 'Coins',
        category: 'coins' as const,
        xpReward: 200,
        coinReward: 100,
      },
    ];

    const createdAchievements = await Achievement.insertMany(achievementsList);
    const achievementMap = new Map();
    createdAchievements.forEach((a) => achievementMap.set(a.slug, a));

    console.log('[Seed] Achievements created. Creating demo users...');

    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('Password@123', salt);

    // 1. Admin
    const adminUser = await User.create({
      name: 'Dr. Sarah Chen',
      email: 'teacher@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'admin',
      approvalStatus: 'approved',
      facultyDesignation: 'Head of CSE Department',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'FAC-CSE-01',
      department: 'Computer Science & Engineering',
      year: 'Faculty',
      section: 'Department Head',
      coins: 0,
      points: 0,
      xp: 0,
      level: 10,
      streak: 0,
      isDemoUser: true,
    });

    // 2. Approved Faculty
    const approvedFaculty = await User.create({
      name: 'Prof. Marcus Brody',
      email: 'marcus.faculty@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'faculty',
      approvalStatus: 'approved',
      facultyDesignation: 'Associate Professor',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'FAC-CSE-02',
      department: 'Computer Science & Engineering',
      year: 'Faculty',
      section: 'Staff',
      coins: 0,
      points: 0,
      xp: 0,
      level: 5,
      streak: 0,
      isDemoUser: true,
    });

    // 3. Pending Faculty Applicant (For demonstration in Admin Approval Queue)
    const pendingFaculty = await User.create({
      name: 'Dr. Elena Rostova',
      email: 'elena.pending@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'faculty',
      approvalStatus: 'pending',
      facultyDesignation: 'Assistant Professor (Networks)',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'FAC-APPL-09',
      department: 'Computer Science & Engineering',
      year: 'Faculty Applicant',
      section: 'Pending Verification',
      coins: 0,
      points: 0,
      xp: 0,
      level: 1,
      streak: 0,
      isDemoUser: true,
    });

    // 2. Demo Students
    const student1 = await User.create({
      name: 'Alex Rivera',
      email: 'alex@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-001',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'Section A',
      coins: 485,
      points: 485,
      xp: 720,
      level: 4,
      streak: 6,
      lastSubmittedDate: new Date().toISOString().split('T')[0],
      targetWeeklyTasks: 5,
      targetCoinGoal: 600,
      isDemoUser: true,
    });

    const student2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-002',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'Section A',
      coins: 395,
      points: 395,
      xp: 590,
      level: 3,
      streak: 4,
      lastSubmittedDate: new Date().toISOString().split('T')[0],
      targetWeeklyTasks: 4,
      targetCoinGoal: 500,
      isDemoUser: true,
    });

    const student3 = await User.create({
      name: 'Liam O\'Connor',
      email: 'liam@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-003',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'Section A',
      coins: 310,
      points: 310,
      xp: 460,
      level: 3,
      streak: 3,
      lastSubmittedDate: new Date().toISOString().split('T')[0],
      targetWeeklyTasks: 5,
      targetCoinGoal: 450,
      isDemoUser: true,
    });

    const student4 = await User.create({
      name: 'Chloe Bennett',
      email: 'chloe@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-004',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'Section B',
      coins: 240,
      points: 240,
      xp: 360,
      level: 2,
      streak: 2,
      lastSubmittedDate: new Date().toISOString().split('T')[0],
      targetWeeklyTasks: 4,
      targetCoinGoal: 400,
      isDemoUser: true,
    });

    const student5 = await User.create({
      name: 'Marcus Vance',
      email: 'marcus@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-005',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      section: 'Section B',
      coins: 175,
      points: 175,
      xp: 260,
      level: 2,
      streak: 1,
      targetWeeklyTasks: 3,
      targetCoinGoal: 300,
      isDemoUser: true,
    });

    const student6 = await User.create({
      name: 'Maya Lin',
      email: 'maya@campusquest.edu',
      passwordHash: demoPasswordHash,
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
      rollNumber: 'CQ-2026-006',
      department: 'Information Technology',
      year: '3rd Year',
      section: 'Section A',
      coins: 120,
      points: 120,
      xp: 180,
      level: 1,
      streak: 1,
      targetWeeklyTasks: 3,
      targetCoinGoal: 250,
      isDemoUser: true,
    });

    const allStudents = [student1, student2, student3, student4, student5, student6];
    const allStudentIds = allStudents.map((s) => s._id);

    console.log('[Seed] Creating demo subjects...');

    const subjectsData = [
      {
        name: 'Database Management Systems',
        code: 'CS-301',
        description: 'Relational algebra, SQL optimization, ACID transactions, B+ trees, and distributed databases.',
        semester: 'Semester V',
        academicYear: '2026-2027',
        facultyName: 'Dr. Sarah Chen',
        color: '#8b5cf6', // Electric Violet
        icon: 'Database',
        enrolledStudents: allStudentIds,
        createdBy: adminUser._id,
      },
      {
        name: 'Operating Systems & Architecture',
        code: 'CS-302',
        description: 'Kernel architectures, multi-threading, CPU scheduling, virtual memory, and file systems.',
        semester: 'Semester V',
        academicYear: '2026-2027',
        facultyName: 'Prof. Marcus Brody',
        color: '#06b6d4', // Cyan
        icon: 'Cpu',
        enrolledStudents: allStudentIds,
        createdBy: adminUser._id,
      },
      {
        name: 'Computer Networks & Security',
        code: 'CS-303',
        description: 'OSI/TCP-IP stacks, BGP routing, congestion control, TLS 1.3 handshake, and network analysis.',
        semester: 'Semester V',
        academicYear: '2026-2027',
        facultyName: 'Dr. Elena Rostova',
        color: '#10b981', // Emerald
        icon: 'Network',
        enrolledStudents: allStudentIds,
        createdBy: adminUser._id,
      },
      {
        name: 'Modern Web Technologies',
        code: 'CS-304',
        description: 'Full-stack engineering with TypeScript, React, Node.js, WebSockets, and cloud deployment.',
        semester: 'Semester V',
        academicYear: '2026-2027',
        facultyName: 'Prof. David Kim',
        color: '#f59e0b', // Radiant Gold
        icon: 'Globe',
        enrolledStudents: allStudentIds,
        createdBy: adminUser._id,
      },
    ];

    const createdSubjects = await Subject.insertMany(subjectsData);
    const [dbmsSubj, osSubj, netSubj, webSubj] = createdSubjects;

    console.log('[Seed] Creating tasks with early bonus rules and varying deadlines...');

    const now = new Date();
    const addDays = (days: number, hours: number = 23, mins: number = 59) => {
      const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      d.setHours(hours, mins, 0, 0);
      return d;
    };

    const tasksData = [
      {
        title: 'ER Modeling and Relational Normalization (3NF/BCNF)',
        description: 'Construct a complete Entity-Relationship diagram for a multi-tenant logistics platform and normalize to Boyce-Codd Normal Form.',
        instructions: '1. Identify all primary and foreign keys.\n2. Document functional dependencies.\n3. Show step-by-step decomposition to 3NF and BCNF.\n4. Submit as PDF or SQL schema.',
        subject: dbmsSubj._id,
        category: 'assignment' as const,
        deadline: addDays(3),
        maxBasePoints: 100,
        bonusRules: { firstBonus: 50, secondBonus: 35, thirdBonus: 20, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['file', 'url', 'text'],
        allowResubmission: true,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'Complex SQL Triggers & Stored Procedures Lab',
        description: 'Implement audit triggers and stored procedures for an automated inventory deduction engine with rollbacks.',
        instructions: 'Test your procedures with concurrent transaction isolation levels. Include test output screenshots.',
        subject: dbmsSubj._id,
        category: 'lab_activity' as const,
        deadline: addDays(6),
        maxBasePoints: 120,
        bonusRules: { firstBonus: 60, secondBonus: 40, thirdBonus: 25, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['file', 'url'],
        allowResubmission: false,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'CPU Scheduling Simulation (FCFS, SJF, Round Robin)',
        description: 'Develop a C++ or Python simulation comparing turnaround time and waiting time for various scheduling algorithms.',
        instructions: 'Include Gantt chart generation and benchmark graphs for varying quantum sizes (2ms vs 10ms).',
        subject: osSubj._id,
        category: 'practical_record' as const,
        deadline: addDays(4),
        maxBasePoints: 100,
        bonusRules: { firstBonus: 50, secondBonus: 30, thirdBonus: 15, latePenaltyPct: 40 },
        allowedSubmissionTypes: ['file', 'url'],
        allowResubmission: false,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'Wireshark Packet Sniffing & TLS Flow Analysis',
        description: 'Analyze capture files to decode TCP 3-way handshakes, selective acknowledgments, and TLS 1.3 Key Exchange.',
        instructions: 'Highlight packet captures for SYN, SYN-ACK, ACK, and encrypted application data.',
        subject: netSubj._id,
        category: 'lab_activity' as const,
        deadline: addDays(1, 18, 0), // Urgent! Due tomorrow
        maxBasePoints: 90,
        bonusRules: { firstBonus: 45, secondBonus: 30, thirdBonus: 15, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['file', 'url'],
        allowResubmission: true,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'HTTP/3 QUIC Protocol vs HTTP/2 Deep Dive Presentation',
        description: 'Prepare an executive slide deck evaluating head-of-line blocking reduction and UDP performance in HTTP/3.',
        instructions: 'Deliver a 10-slide deck with latency benchmarks and browser support matrices.',
        subject: netSubj._id,
        category: 'presentation' as const,
        deadline: addDays(8),
        maxBasePoints: 110,
        bonusRules: { firstBonus: 55, secondBonus: 35, thirdBonus: 20, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['file', 'url'],
        allowResubmission: true,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'Full-Stack React + Node.js REST API with JWT Auth',
        description: 'Construct a secure full-stack application featuring role-based authorization, refresh tokens, and indexed database queries.',
        instructions: 'Submit GitHub repository URL and live deployed link.',
        subject: webSubj._id,
        category: 'project' as const,
        deadline: addDays(11),
        maxBasePoints: 150,
        bonusRules: { firstBonus: 75, secondBonus: 50, thirdBonus: 30, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['url', 'file'],
        allowResubmission: true,
        status: 'published' as const,
        createdBy: adminUser._id,
      },
      {
        title: 'Responsive Flexbox & CSS Grid Dashboard Layout',
        description: 'Build an ultra-responsive responsive dashboard layout utilizing modern CSS grid and semantic HTML5 elements.',
        instructions: 'Ensure zero media query breakages from 320px to 2560px screen widths.',
        subject: webSubj._id,
        category: 'assignment' as const,
        deadline: addDays(-2), // Past deadline (completed task with submissions)
        maxBasePoints: 100,
        bonusRules: { firstBonus: 50, secondBonus: 35, thirdBonus: 20, latePenaltyPct: 50 },
        allowedSubmissionTypes: ['file', 'url'],
        allowResubmission: false,
        status: 'published' as const,
        submissionCount: 3,
        createdBy: adminUser._id,
      },
    ];

    const createdTasks = await Task.insertMany(tasksData);
    const pastTask = createdTasks[6]; // Responsive CSS task
    const dbmsTask = createdTasks[0]; // ER Modeling task

    console.log('[Seed] Creating demo submissions and awarding bonuses...');

    // Submission 1: Alex Rivera (1st place on past task)
    const alexSub = await Submission.create({
      task: pastTask._id,
      student: student1._id,
      subject: webSubj._id,
      submissionType: 'url',
      submissionUrl: 'https://github.com/alexrivera/css-grid-mastery-demo',
      notes: 'Completed with full 320px-4k responsive tests and dark theme.',
      status: 'submitted',
      submittedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      isLate: false,
      rewardCoins: 150, // 100 base + 50 1st place bonus
      rewardPoints: 150,
      bonusRankAwarded: 1,
    });

    await CoinTransaction.create({
      student: student1._id,
      task: pastTask._id,
      amount: 100,
      type: 'base_reward',
      reason: `Submission completed: "${pastTask.title}"`,
      balanceAfter: 435,
      createdAt: alexSub.submittedAt,
    });

    await CoinTransaction.create({
      student: student1._id,
      task: pastTask._id,
      amount: 50,
      type: 'early_bird_bonus',
      reason: `Early Bird Podium Bonus (1st submitter): "${pastTask.title}"`,
      balanceAfter: 485,
      createdAt: alexSub.submittedAt,
    });

    // Submission 2: Priya Sharma (2nd place on past task)
    const priyaSub = await Submission.create({
      task: pastTask._id,
      student: student2._id,
      subject: webSubj._id,
      submissionType: 'url',
      submissionUrl: 'https://github.com/priyasharma/responsive-grid-dashboard',
      notes: 'Implemented using pure CSS custom properties and modern clamp() functions.',
      status: 'submitted',
      submittedAt: new Date(now.getTime() - 3.8 * 24 * 60 * 60 * 1000),
      isLate: false,
      rewardCoins: 135, // 100 base + 35 2nd place bonus
      rewardPoints: 135,
      bonusRankAwarded: 2,
    });

    await CoinTransaction.create({
      student: student2._id,
      task: pastTask._id,
      amount: 100,
      type: 'base_reward',
      reason: `Submission completed: "${pastTask.title}"`,
      balanceAfter: 360,
      createdAt: priyaSub.submittedAt,
    });

    await CoinTransaction.create({
      student: student2._id,
      task: pastTask._id,
      amount: 35,
      type: 'early_bird_bonus',
      reason: `Early Bird Podium Bonus (2nd submitter): "${pastTask.title}"`,
      balanceAfter: 395,
      createdAt: priyaSub.submittedAt,
    });

    // Submission 3: Liam O'Connor (3rd place on past task)
    const liamSub = await Submission.create({
      task: pastTask._id,
      student: student3._id,
      subject: webSubj._id,
      submissionType: 'url',
      submissionUrl: 'https://github.com/liamoconnor/css-layout-showcase',
      notes: 'All lighthouse accessibility benchmarks 100/100.',
      status: 'submitted',
      submittedAt: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000),
      isLate: false,
      rewardCoins: 120, // 100 base + 20 3rd place bonus
      rewardPoints: 120,
      bonusRankAwarded: 3,
    });

    await CoinTransaction.create({
      student: student3._id,
      task: pastTask._id,
      amount: 100,
      type: 'base_reward',
      reason: `Submission completed: "${pastTask.title}"`,
      balanceAfter: 290,
      createdAt: liamSub.submittedAt,
    });

    await CoinTransaction.create({
      student: student3._id,
      task: pastTask._id,
      amount: 20,
      type: 'early_bird_bonus',
      reason: `Early Bird Podium Bonus (3rd submitter): "${pastTask.title}"`,
      balanceAfter: 310,
      createdAt: liamSub.submittedAt,
    });

    // Also give Alex a submission on dbmsTask (1st place)
    const alexDbmsSub = await Submission.create({
      task: dbmsTask._id,
      student: student1._id,
      subject: dbmsSubj._id,
      submissionType: 'text',
      textResponse: 'Entity LogisticsHub has PK HubID. Relations HubToRoute (1:M). BCNF satisfied because every determinant HubID, RouteID is a superkey.',
      notes: 'Detailed mathematical normalization proof attached in text.',
      status: 'submitted',
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      isLate: false,
      rewardCoins: 150,
      rewardPoints: 150,
      bonusRankAwarded: 1,
    });

    await Task.findByIdAndUpdate(dbmsTask._id, { $inc: { submissionCount: 1 } });

    console.log('[Seed] Unlocking demo achievements and creating notifications...');

    // Assign achievements
    await UserAchievement.insertMany([
      { student: student1._id, achievement: achievementMap.get('first_submission')._id },
      { student: student1._id, achievement: achievementMap.get('early_bird')._id },
      { student: student1._id, achievement: achievementMap.get('podium_finisher')._id },
      { student: student1._id, achievement: achievementMap.get('consistency_champion')._id },
      { student: student2._id, achievement: achievementMap.get('first_submission')._id },
      { student: student2._id, achievement: achievementMap.get('podium_finisher')._id },
      { student: student2._id, achievement: achievementMap.get('consistency_champion')._id },
      { student: student3._id, achievement: achievementMap.get('first_submission')._id },
      { student: student3._id, achievement: achievementMap.get('podium_finisher')._id },
    ]);

    // Notifications
    await Notification.insertMany([
      {
        user: student1._id,
        title: '🥇 1st Place Bonus Awarded!',
        message: 'Congratulations! You secured 1st place bonus (+50 coins) for "ER Modeling and Relational Normalization".',
        type: 'reward_earned',
        link: `/tasks/${dbmsTask._id}`,
      },
      {
        user: student1._id,
        title: '🔥 6-Day Submission Streak!',
        message: 'You are on fire! 1 more day until you unlock the Unstoppable Momentum badge.',
        type: 'general',
      },
      {
        user: student2._id,
        title: '🥈 2nd Place Podium Finisher!',
        message: 'You won +35 early bird coins for submitting "Responsive Flexbox & CSS Grid Layout".',
        type: 'reward_earned',
        link: `/tasks/${pastTask._id}`,
      },
      {
        user: student1._id,
        title: '⏰ Deadline Tomorrow: Wireshark Packet Sniffing',
        message: 'The lab activity for Computer Networks is due tomorrow at 18:00.',
        type: 'deadline_warning',
      },
    ]);

    await AuditLog.create({
      action: 'SYSTEM_SEED',
      performedBy: adminUser._id,
      targetType: 'System',
      details: {
        message: 'Database initialized with realistic subjects, demo students, and sample submissions',
      },
    });

    console.log('[Seed] Database successfully seeded with rich demo data!');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (require.main === module) {
  seedDatabase().then(() => {
    console.log('[Seed] Exiting seed process.');
    process.exit(0);
  });
}

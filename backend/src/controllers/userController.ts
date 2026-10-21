import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/authMiddleware';

/**
 * ADMIN ONLY: Get all registered users (students, faculty, administrators)
 * Excludes password hashes and secrets. Queries active MongoDB Atlas database.
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, role, status, accountStatus } = req.query;

    const query: any = {};

    if (search && typeof search === 'string') {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { rollNumber: { $regex: term, $options: 'i' } },
        { facultyDesignation: { $regex: term, $options: 'i' } },
        { department: { $regex: term, $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.approvalStatus = status;
    }

    if (accountStatus === 'active') {
      query.isActive = { $ne: false };
    } else if (accountStatus === 'deactivated') {
      query.isActive = false;
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .populate('deactivatedBy', 'name email role')
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    // Summary statistics for admin overview
    const [totalStudents, activeStudents, deactivatedStudents, totalFaculty, totalAdmins] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', isActive: { $ne: false } }),
      User.countDocuments({ role: 'student', isActive: false }),
      User.countDocuments({ role: 'faculty' }),
      User.countDocuments({ role: 'admin' }),
    ]);

    res.json({
      success: true,
      users,
      total,
      stats: {
        totalUsers: totalStudents + totalFaculty + totalAdmins,
        totalStudents,
        activeStudents,
        deactivatedStudents,
        totalFaculty,
        totalAdmins,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching registered users' });
  }
};

export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, department, section, includeInactive, page = 1, limit = 100 } = req.query;

    const query: any = { role: 'student' };

    if (includeInactive !== 'true') {
      query.isActive = { $ne: false };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (section && section !== 'all') {
      query.section = section;
    }

    const students = await User.find(query)
      .select('-passwordHash')
      .sort({ rollNumber: 1, name: 1 })
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({ success: true, students, total });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching students' });
  }
};

export const addStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, rollNumber, department, year, section, password } = req.body;

    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    const defaultPassword = password || 'CampusQuest@2026';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(defaultPassword, salt);

    const student = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      rollNumber: rollNumber || `CQ-${Math.floor(1000 + Math.random() * 9000)}`,
      department: department || 'Computer Science & Engineering',
      year: year || '3rd Year',
      section: section || 'Section A',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      coins: 50,
      points: 50,
      xp: 75,
      level: 1,
    });

    // Auto-enroll in active subjects
    await Subject.updateMany(
      { isArchived: false },
      { $addToSet: { enrolledStudents: student._id } }
    );

    await AuditLog.create({
      action: 'ADD_STUDENT',
      performedBy: req.user!._id,
      targetType: 'User',
      targetId: student._id.toString(),
      details: { name: student.name, email: student.email, rollNumber: student.rollNumber },
    });

    res.status(201).json({
      success: true,
      message: 'Student created and enrolled successfully',
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        section: student.section,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error adding student' });
  }
};

export const importStudentsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { csvData } = req.body; // Raw CSV string or text

    if (!csvData || typeof csvData !== 'string') {
      res.status(400).json({ success: false, message: 'CSV data string is required' });
      return;
    }

    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      res.status(400).json({ success: false, message: 'CSV file is empty or missing data rows' });
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indexes
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const emailIdx = headers.findIndex((h) => h.includes('email'));
    const rollIdx = headers.findIndex((h) => h.includes('roll'));
    const deptIdx = headers.findIndex((h) => h.includes('dept') || h.includes('department'));
    const secIdx = headers.findIndex((h) => h.includes('sec') || h.includes('section'));

    if (emailIdx === -1 || nameIdx === -1) {
      res.status(400).json({ success: false, message: 'CSV must contain at least "name" and "email" columns' });
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const defaultSalt = await bcrypt.genSalt(10);
    const defaultHash = await bcrypt.hash('CampusQuest@2026', defaultSalt);

    const newStudentIds: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const name = cols[nameIdx];
      const email = cols[emailIdx]?.toLowerCase();
      const rollNumber = rollIdx !== -1 ? cols[rollIdx] : `CQ-${1000 + i}`;
      const department = deptIdx !== -1 ? cols[deptIdx] : 'Computer Science & Engineering';
      const section = secIdx !== -1 ? cols[secIdx] : 'Section A';

      if (!name || !email) {
        skippedCount++;
        continue;
      }

      const existing = await User.findOne({ email });
      if (existing) {
        skippedCount++;
        continue;
      }

      const student = await User.create({
        name,
        email,
        passwordHash: defaultHash,
        role: 'student',
        rollNumber,
        department,
        year: '3rd Year',
        section,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
        coins: 50,
        points: 50,
        xp: 75,
        level: 1,
      });

      newStudentIds.push(student._id);
      importedCount++;
    }

    if (newStudentIds.length > 0) {
      // Auto-enroll new students in active subjects
      await Subject.updateMany(
        { isArchived: false },
        { $addToSet: { enrolledStudents: { $each: newStudentIds } } }
      );
    }

    await AuditLog.create({
      action: 'IMPORT_STUDENTS_CSV',
      performedBy: req.user!._id,
      targetType: 'User',
      details: { importedCount, skippedCount, totalProcessed: lines.length - 1 },
    });

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} student(s) (${skippedCount} skipped/duplicates). Default password: CampusQuest@2026`,
      importedCount,
      skippedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error importing CSV' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email avatar role')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching audit logs' });
  }
};

/**
 * ADMIN ONLY: Safely remove / deactivate a student account.
 * Reversibly marks account as isActive: false, unenrolls student from active Subject rosters,
 * preserves all historical academic Submissions and CoinTransactions for audit compliance,
 * and records an auditable entry in AuditLog.
 */
export const removeStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Administrator privileges required' });
      return;
    }

    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid student ID format' });
      return;
    }

    // Prevent self-deletion
    if (req.user._id.toString() === id) {
      res.status(400).json({ success: false, message: 'Administrators cannot remove their own account' });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Student account not found' });
      return;
    }

    // Only allow student role removal through this endpoint
    if (targetUser.role !== 'student') {
      res.status(403).json({
        success: false,
        message: `Only student accounts can be removed via this endpoint. Target user has role '${targetUser.role}'.`,
      });
      return;
    }

    if (targetUser.isActive === false) {
      res.status(400).json({
        success: false,
        message: 'Student account has already been deactivated/removed',
      });
      return;
    }

    // Determine related records for audit preservation
    const submissionCount = await Submission.countDocuments({ student: targetUser._id });
    const transactionCount = await CoinTransaction.countDocuments({ student: targetUser._id });

    // Clean up active course enrollments so class rosters/stats do not retain broken references
    const unenrollResult = await Subject.updateMany(
      { enrolledStudents: targetUser._id },
      { $pull: { enrolledStudents: targetUser._id } }
    );

    const deactivationReason = req.body?.reason?.trim() || 'Removed by administrator in User Management';

    // Perform reversible deactivation
    targetUser.isActive = false;
    targetUser.deactivatedAt = new Date();
    targetUser.deactivatedBy = req.user._id;
    targetUser.deactivationReason = deactivationReason;
    await targetUser.save();

    // Create Audit Log
    await AuditLog.create({
      action: 'STUDENT_ACCOUNT_REMOVED',
      performedBy: req.user._id,
      targetType: 'User',
      targetId: targetUser._id.toString(),
      details: {
        studentName: targetUser.name,
        studentEmail: targetUser.email,
        rollNumber: targetUser.rollNumber,
        department: targetUser.department,
        submissionsPreserved: submissionCount,
        coinTransactionsPreserved: transactionCount,
        subjectsUnenrolledCount: unenrollResult.modifiedCount,
        reason: deactivationReason,
        deactivatedAt: targetUser.deactivatedAt,
      },
      ip: req.ip || '',
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Student account for ${targetUser.name} (${targetUser.email}) removed successfully. ${submissionCount} submission records and ${transactionCount} reward ledger transactions were safely preserved for institutional audit trails.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: false,
        deactivatedAt: targetUser.deactivatedAt,
      },
      preserved: {
        submissions: submissionCount,
        coinTransactions: transactionCount,
        unenrolledSubjects: unenrollResult.modifiedCount,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error removing student account' });
  }
};

/**
 * ADMIN ONLY: Reactivate a previously deactivated student account.
 */
export const reactivateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Administrator privileges required' });
      return;
    }

    const { id } = req.params;

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid student ID format' });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Student account not found' });
      return;
    }

    if (targetUser.role !== 'student') {
      res.status(403).json({ success: false, message: 'Only student accounts can be reactivated' });
      return;
    }

    if (targetUser.isActive !== false) {
      res.status(400).json({ success: false, message: 'Student account is already active' });
      return;
    }

    targetUser.isActive = true;
    targetUser.deactivatedAt = undefined;
    targetUser.deactivatedBy = undefined;
    targetUser.deactivationReason = undefined;
    await targetUser.save();

    await AuditLog.create({
      action: 'STUDENT_ACCOUNT_REACTIVATED',
      performedBy: req.user._id,
      targetType: 'User',
      targetId: targetUser._id.toString(),
      details: {
        studentName: targetUser.name,
        studentEmail: targetUser.email,
        rollNumber: targetUser.rollNumber,
      },
      ip: req.ip || '',
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `Student account for ${targetUser.name} (${targetUser.email}) reactivated successfully.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isActive: true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error reactivating student account' });
  }
};

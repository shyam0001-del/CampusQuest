import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { ENV } from '../config/env';
import { AuthRequest } from '../middleware/authMiddleware';

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, role: user.role, approvalStatus: user.approvalStatus },
    ENV.JWT_SECRET,
    { expiresIn: ENV.JWT_EXPIRES_IN as any }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      email,
      password,
      accountType, // 'student' or 'faculty'
      designation,
      rollNumber,
      department,
      year,
      section,
    } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // SECURITY: Strictly enforce role assignment.
    // Public registration CANNOT grant 'admin' role under ANY circumstance.
    const isFacultyRequest = accountType === 'faculty' || req.body.role === 'faculty';
    const assignedRole = isFacultyRequest ? 'faculty' : 'student';
    // Faculty registration enters 'pending' state requiring admin approval
    const assignedApprovalStatus = isFacultyRequest ? 'pending' : 'approved';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      approvalStatus: assignedApprovalStatus,
      facultyDesignation: isFacultyRequest ? (designation || 'Faculty Member').trim() : '',
      rollNumber: isFacultyRequest ? '' : (rollNumber || `CQ-${Math.floor(1000 + Math.random() * 9000)}`),
      department: department || 'Computer Science & Engineering',
      year: isFacultyRequest ? 'Faculty' : (year || '3rd Year'),
      section: isFacultyRequest ? 'Staff' : (section || 'Section A'),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      coins: isFacultyRequest ? 0 : 50, // Starting welcome coins for students
      points: isFacultyRequest ? 0 : 50,
      xp: isFacultyRequest ? 0 : 75,
      level: 1,
      streak: 0,
    });

    // Notify administrators if a new faculty account is pending approval
    if (assignedRole === 'faculty') {
      const admins = await User.find({ role: 'admin' }).select('_id');
      const notifications = admins.map((adm) => ({
        user: adm._id,
        title: '📋 Faculty Verification Request',
        message: `${user.name} (${user.facultyDesignation || 'Faculty'}, ${user.department}) submitted a registration application pending your review.`,
        type: 'general' as const,
        link: '/admin',
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      message: isFacultyRequest
        ? 'Faculty account created successfully. Your application is pending review by the department administrator.'
        : 'Student account created successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        facultyDesignation: user.facultyDesignation,
        avatar: user.avatar,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        section: user.section,
        coins: user.coins,
        points: user.points,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        targetWeeklyTasks: user.targetWeeklyTasks,
        targetCoinGoal: user.targetCoinGoal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Please provide email and password' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated by the administrator. Please contact academic support.',
      });
      return;
    }

    if (user.role === 'faculty' && user.approvalStatus === 'rejected') {
      res.status(403).json({
        success: false,
        message: 'Your faculty application was rejected. Please contact the administrator.',
        rejectionReason: user.rejectionReason,
      });
      return;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        facultyDesignation: user.facultyDesignation,
        avatar: user.avatar,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        section: user.section,
        coins: user.coins,
        points: user.points,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        targetWeeklyTasks: user.targetWeeklyTasks,
        targetCoinGoal: user.targetCoinGoal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const demoLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    if (ENV.NODE_ENV === 'production') {
      res.status(403).json({ success: false, message: 'Demo quick logins are disabled in production' });
      return;
    }

    const { role } = req.body; // 'student' or 'admin' or 'faculty'
    const targetRole = role === 'admin' ? 'admin' : role === 'faculty' ? 'faculty' : 'student';

    const user = await User.findOne({ role: targetRole, isDemoUser: true });

    if (!user) {
      res.status(404).json({ success: false, message: `No demo ${targetRole} found in local development database.` });
      return;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        facultyDesignation: user.facultyDesignation,
        avatar: user.avatar,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        section: user.section,
        coins: user.coins,
        points: user.points,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        targetWeeklyTasks: user.targetWeeklyTasks,
        targetCoinGoal: user.targetCoinGoal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    let rank: number | null = null;
    if (req.user.role === 'student') {
      const higherRankedCount = await User.countDocuments({
        role: 'student',
        $or: [
          { points: { $gt: req.user.points } },
          { points: req.user.points, coins: { $gt: req.user.coins } },
          { points: req.user.points, coins: req.user.coins, _id: { $lt: req.user._id } },
        ],
      });
      rank = higherRankedCount + 1;
    }

    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        approvalStatus: req.user.approvalStatus,
        facultyDesignation: req.user.facultyDesignation,
        rejectionReason: req.user.rejectionReason,
        avatar: req.user.avatar,
        rollNumber: req.user.rollNumber,
        department: req.user.department,
        year: req.user.year,
        section: req.user.section,
        coins: req.user.coins,
        points: req.user.points,
        xp: req.user.xp,
        level: req.user.level,
        streak: req.user.streak,
        targetWeeklyTasks: req.user.targetWeeklyTasks,
        targetCoinGoal: req.user.targetCoinGoal,
        rank,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const {
      name,
      avatar,
      department,
      year,
      section,
      rollNumber,
      facultyDesignation,
      targetWeeklyTasks,
      targetCoinGoal,
      // Intentionally ignore any malicious role, approvalStatus, coins, points, etc.
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // STRICT WHITELIST OF USER-EDITABLE ATTRIBUTES
    if (name && typeof name === 'string') user.name = name.trim();
    if (avatar && typeof avatar === 'string') user.avatar = avatar;
    if (department && typeof department === 'string') user.department = department.trim();
    if (year && typeof year === 'string') user.year = year.trim();
    if (section && typeof section === 'string') user.section = section.trim();
    if (rollNumber && typeof rollNumber === 'string' && user.role === 'student') {
      user.rollNumber = rollNumber.trim();
    }
    if (facultyDesignation && typeof facultyDesignation === 'string' && user.role !== 'student') {
      user.facultyDesignation = facultyDesignation.trim();
    }
    if (targetWeeklyTasks !== undefined) user.targetWeeklyTasks = Number(targetWeeklyTasks);
    if (targetCoinGoal !== undefined) user.targetCoinGoal = Number(targetCoinGoal);

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        facultyDesignation: user.facultyDesignation,
        avatar: user.avatar,
        rollNumber: user.rollNumber,
        department: user.department,
        year: user.year,
        section: user.section,
        coins: user.coins,
        points: user.points,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        targetWeeklyTasks: user.targetWeeklyTasks,
        targetCoinGoal: user.targetCoinGoal,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * ADMIN ONLY: Get list of faculty registration applications awaiting review
 */
export const getPendingFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pendingFaculty = await User.find({
      role: 'faculty',
      approvalStatus: 'pending',
    })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: pendingFaculty.length, pendingFaculty });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * ADMIN ONLY: Approve faculty application
 */
export const approveFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const facultyUser = await User.findById(id);
    if (!facultyUser) {
      res.status(404).json({ success: false, message: 'Faculty user not found' });
      return;
    }

    if (facultyUser.role !== 'faculty') {
      res.status(400).json({ success: false, message: 'User is not a faculty applicant' });
      return;
    }

    facultyUser.approvalStatus = 'approved';
    facultyUser.approvedBy = req.user!._id;
    facultyUser.approvedAt = new Date();
    facultyUser.rejectionReason = '';
    await facultyUser.save();

    await Notification.create({
      user: facultyUser._id,
      title: '🎓 Faculty Application Approved!',
      message: 'Your faculty account has been approved by the administrator. You now have academic publishing and class management privileges.',
      type: 'general',
      link: '/admin',
    });

    await AuditLog.create({
      action: 'APPROVE_FACULTY',
      performedBy: req.user!._id,
      targetType: 'User',
      targetId: facultyUser._id.toString(),
      details: { email: facultyUser.email, name: facultyUser.name, department: facultyUser.department },
    });

    res.json({
      success: true,
      message: `Faculty account for ${facultyUser.name} has been approved successfully.`,
      faculty: {
        id: facultyUser._id,
        name: facultyUser.name,
        email: facultyUser.email,
        role: facultyUser.role,
        approvalStatus: facultyUser.approvalStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * ADMIN ONLY: Reject faculty application
 */
export const rejectFaculty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const facultyUser = await User.findById(id);
    if (!facultyUser) {
      res.status(404).json({ success: false, message: 'Faculty user not found' });
      return;
    }

    facultyUser.approvalStatus = 'rejected';
    facultyUser.rejectionReason = reason || 'Application did not meet department verification criteria.';
    await facultyUser.save();

    await AuditLog.create({
      action: 'REJECT_FACULTY',
      performedBy: req.user!._id,
      targetType: 'User',
      targetId: facultyUser._id.toString(),
      details: { email: facultyUser.email, reason: facultyUser.rejectionReason },
    });

    res.json({
      success: true,
      message: `Faculty application for ${facultyUser.name} was rejected.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

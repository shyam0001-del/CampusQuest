import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { ENV } from '../config/env';
import { AuthRequest } from '../middleware/authMiddleware';

const generateToken = (user: IUser): string => {
  return jwt.sign({ id: user._id, role: user.role }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN as any,
  });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, rollNumber, department, year, section } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'student',
      rollNumber: rollNumber || '',
      department: department || 'Computer Science & Engineering',
      year: year || '3rd Year',
      section: section || 'Section A',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      coins: 50, // Starting welcome coins
      points: 50,
      xp: 75,
      level: 1,
      streak: 0,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
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

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
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
    const { role } = req.body; // 'student' or 'admin'
    const targetRole = role === 'admin' ? 'admin' : 'student';

    // Find demo user or first user with matching role
    let user = await User.findOne({ role: targetRole, isDemoUser: true });
    if (!user) {
      user = await User.findOne({ role: targetRole });
    }

    if (!user) {
      res.status(404).json({ success: false, message: `No demo ${targetRole} found in database. Please run seed.` });
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

    // Determine current student rank if student
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

    const { name, avatar, department, year, section, rollNumber, targetWeeklyTasks, targetCoinGoal } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    if (department) user.department = department;
    if (year) user.year = year;
    if (section) user.section = section;
    if (rollNumber) user.rollNumber = rollNumber;
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

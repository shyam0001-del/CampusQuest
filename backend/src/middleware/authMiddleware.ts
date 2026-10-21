import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { User, IUser } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  role: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized: No authentication token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      res.status(401).json({ success: false, message: 'User belonging to this token no longer exists' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact academic administration.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Enforces that user is either an Administrator OR an Approved Faculty member.
 * Blocks students and pending/rejected faculty.
 */
export const facultyOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  if (req.user.role === 'admin') {
    next();
    return;
  }

  if (req.user.role === 'faculty') {
    if (req.user.approvalStatus === 'approved') {
      next();
      return;
    }
    if (req.user.approvalStatus === 'pending') {
      res.status(403).json({
        success: false,
        message: 'Faculty account is pending approval by an administrator. Academic publishing privileges are locked.',
        pendingApproval: true,
      });
      return;
    }
    res.status(403).json({
      success: false,
      message: 'Faculty application was rejected. Please contact department administration.',
      rejectionReason: req.user.rejectionReason,
    });
    return;
  }

  res.status(403).json({
    success: false,
    message: 'Access denied: Faculty or Administrator authorization required',
  });
};

/**
 * Enforces that only an Administrator can access this route.
 * Rejects all students and faculty members.
 */
export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied: System Administrator privileges required',
    });
    return;
  }
  next();
};

/**
 * Ensures user account is approved (blocks pending or rejected faculty from general student features).
 */
export const approvedOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  if (req.user.approvalStatus !== 'approved') {
    res.status(403).json({
      success: false,
      message: 'Account is pending administrator approval',
      pendingApproval: req.user.approvalStatus === 'pending',
    });
    return;
  }

  next();
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) req.user = user;
    } catch {
      // Ignore token failure for optional auth
    }
  }
  next();
};

import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { AuditLog } from '../models/AuditLog';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, department, section, page = 1, limit = 100 } = req.query;

    const query: any = { role: 'student' };

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

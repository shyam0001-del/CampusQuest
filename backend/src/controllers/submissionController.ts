import { Response } from 'express';
import fs from 'fs';
import { Submission } from '../models/Submission';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { Notification } from '../models/Notification';
import { processSubmissionReward } from '../services/rewardService';
import { AuthRequest } from '../middleware/authMiddleware';
import { runTransactionWithRetry } from '../utils/transaction';

const cleanupUploadedFile = (file?: Express.Multer.File) => {
  if (file?.path) {
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // Ignore cleanup error
    }
  }
};

export const submitWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      cleanupUploadedFile(req.file);
      res.status(403).json({ success: false, message: 'Only registered students can submit coursework' });
      return;
    }

    const { taskId, submissionType = 'file', submissionUrl, textResponse, notes } = req.body;

    if (!taskId) {
      cleanupUploadedFile(req.file);
      res.status(400).json({ success: false, message: 'Task ID is required' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      cleanupUploadedFile(req.file);
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (task.status === 'closed' || task.status === 'archived') {
      cleanupUploadedFile(req.file);
      res.status(400).json({ success: false, message: 'This task is closed for submissions' });
      return;
    }

    // Check existing submission prior to transaction
    const existingSubmission = await Submission.findOne({ task: task._id, student: req.user._id });

    if (existingSubmission && !task.allowResubmission) {
      cleanupUploadedFile(req.file);
      res.status(400).json({
        success: false,
        message: 'You have already submitted this task. Resubmissions are not permitted for this assignment.',
      });
      return;
    }

    // Handle file upload if present
    let fileUrl = '';
    let fileName = '';
    let fileSize = 0;
    let fileMimeType = '';

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
      fileMimeType = req.file.mimetype;
    }

    // Validation based on submissionType
    if (submissionType === 'file' && !fileUrl && !existingSubmission?.fileUrl) {
      cleanupUploadedFile(req.file);
      res.status(400).json({ success: false, message: 'Please attach a submission file' });
      return;
    }

    if (submissionType === 'url' && !submissionUrl && !existingSubmission?.submissionUrl) {
      cleanupUploadedFile(req.file);
      res.status(400).json({ success: false, message: 'Please provide a valid submission URL' });
      return;
    }

    if (submissionType === 'text' && !textResponse && !existingSubmission?.textResponse) {
      cleanupUploadedFile(req.file);
      res.status(400).json({ success: false, message: 'Please provide your text response' });
      return;
    }

    const serverTimestamp = new Date();
    const isLate = serverTimestamp > new Date(task.deadline);

    // If it's an existing submission and resubmission is allowed, update details without re-awarding coins
    if (existingSubmission) {
      existingSubmission.submissionType = submissionType;
      if (fileUrl) {
        existingSubmission.fileUrl = fileUrl;
        existingSubmission.fileName = fileName;
        existingSubmission.fileSize = fileSize;
        existingSubmission.fileMimeType = fileMimeType;
      }
      if (submissionUrl) existingSubmission.submissionUrl = submissionUrl;
      if (textResponse) existingSubmission.textResponse = textResponse;
      if (notes) existingSubmission.notes = notes;
      existingSubmission.submittedAt = serverTimestamp;
      existingSubmission.isLate = isLate;
      await existingSubmission.save();

      res.json({
        success: true,
        message: 'Resubmission saved successfully',
        submission: existingSubmission,
        rewardResult: {
          baseCoins: existingSubmission.rewardCoins,
          bonusCoins: 0,
          totalCoins: existingSubmission.rewardCoins,
          bonusRank: existingSubmission.bonusRankAwarded,
          isLate,
          isResubmission: true,
        },
      });
      return;
    }

    // Execute new submission inside an atomic transaction with automatic retries for transient conflicts
    const result = await runTransactionWithRetry(async (session) => {
      // Re-check inside the transaction session to handle in-flight races
      const existingInSession = await Submission.findOne(
        { task: task._id, student: req.user!._id },
        null,
        session ? { session } : undefined
      );

      if (existingInSession) {
        if (!task.allowResubmission) {
          return {
            statusCode: 200,
            message: 'Assignment submitted successfully!',
            submission: existingInSession,
            rewardResult: {
              baseCoins: existingInSession.rewardCoins,
              bonusCoins: 0,
              totalCoins: existingInSession.rewardCoins,
              bonusRank: existingInSession.bonusRankAwarded,
              isLate: existingInSession.isLate,
              isDuplicate: true,
            },
          };
        }

        // Resubmission detected inside session
        existingInSession.submissionType = submissionType;
        if (fileUrl) {
          existingInSession.fileUrl = fileUrl;
          existingInSession.fileName = fileName;
          existingInSession.fileSize = fileSize;
          existingInSession.fileMimeType = fileMimeType;
        }
        if (submissionUrl) existingInSession.submissionUrl = submissionUrl;
        if (textResponse) existingInSession.textResponse = textResponse;
        if (notes) existingInSession.notes = notes;
        existingInSession.submittedAt = serverTimestamp;
        existingInSession.isLate = isLate;
        await existingInSession.save(session ? { session } : undefined);

        return {
          statusCode: 200,
          message: 'Resubmission saved successfully',
          submission: existingInSession,
          rewardResult: {
            baseCoins: existingInSession.rewardCoins,
            bonusCoins: 0,
            totalCoins: existingInSession.rewardCoins,
            bonusRank: existingInSession.bonusRankAwarded,
            isLate,
            isResubmission: true,
          },
        };
      }

      // Process reward calculation atomically within session
      const rewardResult = await processSubmissionReward(
        req.user!._id,
        task._id,
        serverTimestamp,
        session
      );

      const created = await Submission.create(
        [
          {
            task: task._id,
            student: req.user!._id,
            subject: task.subject,
            submissionType,
            fileUrl,
            fileName,
            fileSize,
            fileMimeType,
            submissionUrl: submissionUrl || '',
            textResponse: textResponse || '',
            notes: notes || '',
            status: isLate ? 'late' : 'submitted',
            submittedAt: serverTimestamp,
            isLate,
            rewardCoins: rewardResult.totalCoins,
            rewardPoints: rewardResult.totalPoints,
            bonusRankAwarded: rewardResult.bonusRank,
          },
        ],
        session ? { session } : undefined
      );

      return {
        statusCode: 201,
        message: 'Assignment submitted successfully!',
        submission: created[0],
        rewardResult,
      };
    });

    // Increment task submission counter after successful commit without contention
    await Task.findByIdAndUpdate(task._id, { $inc: { submissionCount: 1 } });

    res.status(result.statusCode).json({
      success: true,
      message: result.message,
      submission: result.submission,
      rewardResult: result.rewardResult,
    });
  } catch (error: any) {
    // Handle duplicate key error idempotently if race occurred outside transaction
    if (
      error?.code === 11000 &&
      (error?.message?.includes('task_1_student_1') ||
        error?.keyPattern?.student ||
        error?.message?.includes('student_1_task_1_type_1'))
    ) {
      const existing = await Submission.findOne({
        task: req.body.taskId,
        student: req.user?._id,
      });

      if (existing) {
        res.status(200).json({
          success: true,
          message: 'Assignment submitted successfully!',
          submission: existing,
          rewardResult: {
            baseCoins: existing.rewardCoins,
            bonusCoins: 0,
            totalCoins: existing.rewardCoins,
            bonusRank: existing.bonusRankAwarded,
            isLate: existing.isLate,
            isDuplicate: true,
          },
        });
        return;
      }
    }

    cleanupUploadedFile(req.file);
    res.status(500).json({ success: false, message: error.message || 'Error processing submission' });
  }
};

export const getMySubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const submissions = await Submission.find({ student: req.user._id })
      .populate('task', 'title category deadline maxBasePoints bonusRules status')
      .populate('subject', 'name code color icon')
      .sort({ submittedAt: -1 });

    res.json({ success: true, submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching submissions' });
  }
};

export const reviewSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedback, status } = req.body;

    const submission = await Submission.findById(id).populate('task');
    if (!submission) {
      res.status(404).json({ success: false, message: 'Submission not found' });
      return;
    }

    if (feedback !== undefined) submission.feedback = feedback;
    if (status) submission.status = status;
    submission.gradedBy = req.user!._id;

    await submission.save();

    res.json({ success: true, submission });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error reviewing submission' });
  }
};

import { Response } from 'express';
import { Submission } from '../models/Submission';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { processSubmissionReward } from '../services/rewardService';
import { AuthRequest } from '../middleware/authMiddleware';

export const submitWork = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'student') {
      res.status(403).json({ success: false, message: 'Only registered students can submit coursework' });
      return;
    }

    const { taskId, submissionType = 'file', submissionUrl, textResponse, notes } = req.body;

    if (!taskId) {
      res.status(400).json({ success: false, message: 'Task ID is required' });
      return;
    }

    const task = await Task.findById(taskId);
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found' });
      return;
    }

    if (task.status === 'closed' || task.status === 'archived') {
      res.status(400).json({ success: false, message: 'This task is closed for submissions' });
      return;
    }

    // Check existing submission
    const existingSubmission = await Submission.findOne({ task: task._id, student: req.user._id });

    if (existingSubmission && !task.allowResubmission) {
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
      res.status(400).json({ success: false, message: 'Please attach a submission file' });
      return;
    }

    if (submissionType === 'url' && !submissionUrl && !existingSubmission?.submissionUrl) {
      res.status(400).json({ success: false, message: 'Please provide a valid submission URL' });
      return;
    }

    if (submissionType === 'text' && !textResponse && !existingSubmission?.textResponse) {
      res.status(400).json({ success: false, message: 'Please provide your text response' });
      return;
    }

    const serverTimestamp = new Date();
    const isLate = serverTimestamp > new Date(task.deadline);

    // If it's a resubmission, just update details without re-awarding coins
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

    // Process reward calculation atomically
    const rewardResult = await processSubmissionReward(req.user._id, task._id, serverTimestamp);

    const submission = await Submission.create({
      task: task._id,
      student: req.user._id,
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
    });

    // Update submission count on task
    await Task.findByIdAndUpdate(task._id, { $inc: { submissionCount: 1 } });

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully!',
      submission,
      rewardResult,
    });
  } catch (error: any) {
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

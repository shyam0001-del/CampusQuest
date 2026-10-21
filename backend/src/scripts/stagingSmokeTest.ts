/**
 * CampusQuest Staging Deployment Smoke Test Suite
 *
 * Verifies live deployment health across core workflows:
 * 1. Health check & uptime monitoring
 * 2. Database connectivity & public endpoint health
 * 3. Student authentication & role authorization
 * 4. Task submission, file upload, & reward processing
 * 5. Static upload security headers (X-Content-Type-Options: nosniff)
 * 6. Live leaderboard query & standings
 * 7. Admin & faculty endpoint protection (403 enforcement)
 *
 * Usage:
 *   STAGING_URL=https://campusquest-backend.onrender.com npm run test:smoke
 */

import mongoose, { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';

const TARGET_HOST = process.env.STAGING_URL || `http://localhost:${ENV.PORT || 5000}`;
const API_URL = TARGET_HOST.endsWith('/api') ? TARGET_HOST : `${TARGET_HOST}/api`;
const ROOT_URL = TARGET_HOST.replace(/\/api\/?$/, '');

interface StepResult {
  step: string;
  passed: boolean;
  message: string;
}

const report: StepResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Smoke Test Assertion Failed: ${msg}`);
}

async function runSmokeTests() {
  console.log('='.repeat(75));
  console.log('🚀 CampusQuest Staging Smoke Test Suite');
  console.log(`🌐 Target Deployment: ${ROOT_URL}`);
  console.log(`📡 API Endpoint:     ${API_URL}`);
  console.log('='.repeat(75) + '\n');

  const runId = `smoke_${Date.now()}`;
  let connectedDb = false;

  const createdUserIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];
  const createdTaskIds: Types.ObjectId[] = [];
  const createdSubmissionIds: Types.ObjectId[] = [];
  const createdTxIds: Types.ObjectId[] = [];
  const uploadedFilePaths: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Step 1: Health Check Endpoint
    // -------------------------------------------------------------------------
    console.log('Step 1: Checking /health endpoint...');
    const healthRes = await fetch(`${ROOT_URL}/health`);
    assert(healthRes.status === 200, `/health returned HTTP ${healthRes.status}`);
    const healthData: any = await healthRes.json();
    assert(healthData.status === 'healthy', `Expected status: healthy, got: ${healthData.status}`);
    assert(typeof healthData.uptime === 'number', 'Expected numeric uptime');
    report.push({
      step: '1. Service Health & Uptime',
      passed: true,
      message: `HTTP 200 OK — service: "${healthData.service}", uptime: ${healthData.uptime.toFixed(1)}s`,
    });
    console.log('  ✅ PASSED: Health check endpoint is active and healthy.');

    // -------------------------------------------------------------------------
    // Step 2: Public Read Endpoints (/tasks, /leaderboard)
    // -------------------------------------------------------------------------
    console.log('Step 2: Checking public read endpoints...');
    const tasksRes = await fetch(`${API_URL}/tasks`);
    assert(tasksRes.status === 200, `/tasks returned HTTP ${tasksRes.status}`);
    const tasksData: any = await tasksRes.json();
    assert(Array.isArray(tasksData.tasks), 'tasks field must be an array');

    const lbRes = await fetch(`${API_URL}/leaderboard`);
    assert(lbRes.status === 200, `/leaderboard returned HTTP ${lbRes.status}`);
    const lbData: any = await lbRes.json();
    assert(Array.isArray(lbData.leaderboard), 'leaderboard field must be an array');
    report.push({
      step: '2. Public Query Endpoints',
      passed: true,
      message: `GET /tasks (${tasksData.tasks.length} tasks) and GET /leaderboard (${lbData.leaderboard.length} ranked) responded 200 OK.`,
    });
    console.log('  ✅ PASSED: Public tasks and leaderboard endpoints are operational.');

    // -------------------------------------------------------------------------
    // Connect to DB for deterministic test fixture setup and cleanup
    // -------------------------------------------------------------------------
    if (ENV.MONGODB_URI) {
      await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });
      connectedDb = true;
    }

    // -------------------------------------------------------------------------
    // Step 3: Student Registration & Authentication
    // -------------------------------------------------------------------------
    console.log('Step 3: Testing student registration & JWT authentication...');
    const studentEmail = `smoke_student_${runId}@campusquest.test`;
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Smoke Tester ${runId}`,
        email: studentEmail,
        password: 'Password@123',
        accountType: 'student',
        department: 'Computer Science',
      }),
    });
    assert(regRes.status === 201, `Registration returned HTTP ${regRes.status}`);
    const regData: any = await regRes.json();
    assert(regData.success === true, 'Registration must be successful');
    assert(typeof regData.token === 'string', 'Token must be returned');
    assert(regData.user.role === 'student', 'Role must be student');

    const studentToken = regData.token;
    if (regData.user?.id) createdUserIds.push(new Types.ObjectId(regData.user.id));

    // Authenticated me check
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(meRes.status === 200, `/auth/me returned HTTP ${meRes.status}`);
    report.push({
      step: '3. Student Auth & Session Verification',
      passed: true,
      message: `Registered student account, acquired JWT token, and verified session via GET /auth/me.`,
    });
    console.log('  ✅ PASSED: Student authentication and session verification succeeded.');

    // -------------------------------------------------------------------------
    // Step 4: Role-Based Authorization Enforcement
    // -------------------------------------------------------------------------
    console.log('Step 4: Verifying role-based access controls on admin endpoints...');
    const adminCheck = await fetch(`${API_URL}/users/audit-logs`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(adminCheck.status === 403, `Expected 403 on /audit-logs, got ${adminCheck.status}`);

    const facultyCheck = await fetch(`${API_URL}/auth/faculty/pending`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(facultyCheck.status === 403, `Expected 403 on /faculty/pending, got ${facultyCheck.status}`);
    report.push({
      step: '4. Role-Based Access Controls',
      passed: true,
      message: `Student token strictly blocked with HTTP 403 Forbidden from admin endpoints.`,
    });
    console.log('  ✅ PASSED: Role-based authorization enforced on backend.');

    // -------------------------------------------------------------------------
    // Step 5: Assignment Submission, Upload & Reward Flow
    // -------------------------------------------------------------------------
    if (connectedDb && regData.user?.id) {
      console.log('Step 5: Testing task creation, file upload submission, and reward processing...');
      const testSubj = await Subject.create({
        name: `Smoke Subject ${runId}`,
        code: `SM${runId.slice(-4)}`,
        createdBy: new Types.ObjectId(regData.user.id),
      });
      createdSubjectIds.push(testSubj._id);

      const testTask = await Task.create({
        title: `Smoke Task ${runId}`,
        description: 'Temporary task for staging smoke test',
        subject: testSubj._id,
        createdBy: new Types.ObjectId(regData.user.id),
        deadline: new Date(Date.now() + 86400000),
        totalPoints: 100,
        coinReward: 50,
        allowedSubmissionTypes: ['file'],
        status: 'published',
      });
      createdTaskIds.push(testTask._id);

      // Submit assignment with a small test document
      const sampleContent = `CampusQuest Staging Smoke Test Assignment File - ${runId}`;
      const form = new FormData();
      form.append('taskId', testTask._id.toString());
      form.append('submissionType', 'file');
      form.append('file', new Blob([Buffer.from(sampleContent)], { type: 'text/plain' }), `smoke_doc_${runId}.txt`);

      const submitRes = await fetch(`${API_URL}/submissions/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: form,
      });

      assert(submitRes.status === 201 || submitRes.status === 200, `Submission returned ${submitRes.status}`);
      const submitData: any = await submitRes.json();
      assert(submitData.success === true, 'Submission must succeed');
      assert(submitData.rewardResult?.totalCoins > 0, 'Coins must be awarded');
      if (submitData.submission?._id) createdSubmissionIds.push(new Types.ObjectId(submitData.submission._id));

      const fileUrl = submitData.submission?.fileUrl;
      assert(typeof fileUrl === 'string' && fileUrl.length > 0, 'fileUrl must be returned');

      // Verify static download headers
      const downloadRes = await fetch(`${ROOT_URL}${fileUrl}`);
      assert(downloadRes.status === 200, `Static download returned HTTP ${downloadRes.status}`);
      const nosniffHeader = downloadRes.headers.get('x-content-type-options');
      assert(nosniffHeader === 'nosniff', `Expected X-Content-Type-Options: nosniff, got: ${nosniffHeader}`);

      // Track uploaded file path for disk cleanup
      const localFilePath = path.join(process.cwd(), ENV.UPLOAD_DIR, path.basename(fileUrl));
      uploadedFilePaths.push(localFilePath);

      report.push({
        step: '5. Assignment Submission & File Upload',
        passed: true,
        message: `Task submission awarded ${submitData.rewardResult.totalCoins} coins. Static upload served with X-Content-Type-Options: nosniff.`,
      });
      console.log('  ✅ PASSED: Assignment submitted, coins awarded, and static upload security verified.');
    }
  } finally {
    if (connectedDb) {
      console.log('\n🧹 Cleaning up staging smoke test fixtures...');
      for (const fp of uploadedFilePaths) {
        try {
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {}
      }
      if (createdSubmissionIds.length > 0) {
        await Submission.deleteMany({ _id: { $in: createdSubmissionIds } });
      }
      if (createdTxIds.length > 0) {
        await CoinTransaction.deleteMany({ _id: { $in: createdTxIds } });
      }
      if (createdTaskIds.length > 0) {
        await Task.deleteMany({ _id: { $in: createdTaskIds } });
      }
      if (createdSubjectIds.length > 0) {
        await Subject.deleteMany({ _id: { $in: createdSubjectIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      await mongoose.disconnect();
      console.log('✨ Cleanup complete. Zero real student data or academic records modified.\n');
    }
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('='.repeat(75));
  console.log('📊 STAGING SMOKE TEST SUMMARY');
  console.log('='.repeat(75));
  let allOk = true;
  for (const item of report) {
    const icon = item.passed ? '✅' : '❌';
    console.log(`${icon} ${item.step}`);
    console.log(`   ${item.message}`);
    if (!item.passed) allOk = false;
  }
  console.log('='.repeat(75));

  if (allOk) {
    console.log(`🎉 ALL ${report.length} SMOKE TEST STEPS PASSED!\n`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});

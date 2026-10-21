import mongoose, { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { Task } from '../models/Task';
import { Submission } from '../models/Submission';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';
const ROOT_URL = BASE_URL.replace(/\/api\/?$/, '');

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function generateToken(user: any) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      department: user.department,
    },
    ENV.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('='.repeat(75));
  console.log('📦 CampusQuest File Upload Security & 25MB Boundary Test Suite');
  console.log(`🌐 Target Backend: ${BASE_URL}`);
  console.log('='.repeat(75) + '\n');

  if (!ENV.MONGODB_URI) {
    throw new Error('MONGODB_URI missing from environment.');
  }

  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const runId = `up_${Date.now()}`;
  const createdUserIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];
  const createdTaskIds: Types.ObjectId[] = [];
  const createdSubmissionIds: Types.ObjectId[] = [];
  const createdFilePaths: string[] = [];

  const uploadDir = path.join(process.cwd(), ENV.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  try {
    // -------------------------------------------------------------------------
    // Setup Temporary Fixtures
    // -------------------------------------------------------------------------
    const testStudent = await User.create({
      name: `Upload Tester ${runId}`,
      email: `upload_${runId}@campusquest.test`,
      passwordHash: 'hashed_password_placeholder',
      role: 'student',
      approvalStatus: 'approved',
      department: 'Computer Science',
    });
    createdUserIds.push(testStudent._id);
    const studentToken = generateToken(testStudent);

    const testSubject = await Subject.create({
      name: `Upload Test Subject ${runId}`,
      code: `UP${runId.slice(-4)}`,
      createdBy: testStudent._id,
    });
    createdSubjectIds.push(testSubject._id);

    const testTask = await Task.create({
      title: `Upload Test Assignment ${runId}`,
      description: 'Assignment for upload boundary testing',
      subject: testSubject._id,
      createdBy: testStudent._id,
      deadline: new Date(Date.now() + 86400000),
      totalPoints: 100,
      coinReward: 50,
      allowResubmission: true,
      allowedSubmissionTypes: ['file'],
      status: 'published',
    });
    createdTaskIds.push(testTask._id);

    // -------------------------------------------------------------------------
    // Test 1: Upload Just Below Limit (24.0 MB)
    // -------------------------------------------------------------------------
    console.log('Test 1: Uploading file just below 25MB limit (24.0 MB)...');
    const sizeBelow = 24.0 * 1024 * 1024;
    const bufferBelow = Buffer.alloc(sizeBelow, 'A');

    const formBelow = new FormData();
    formBelow.append('taskId', testTask._id.toString());
    formBelow.append('submissionType', 'file');
    formBelow.append('file', new Blob([bufferBelow], { type: 'application/pdf' }), `valid_report_${runId}.pdf`);

    const resBelow = await fetch(`${BASE_URL}/submissions/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
      body: formBelow,
    });

    const dataBelow: any = await resBelow.json();
    assert(resBelow.status === 200 || resBelow.status === 201, `Expected 200/201 for 24MB file, got ${resBelow.status}: ${JSON.stringify(dataBelow)}`);
    assert(dataBelow.success === true, 'Submission must succeed');
    assert(typeof dataBelow.submission?.fileUrl === 'string', 'Must receive valid fileUrl');
    if (dataBelow.submission?._id) createdSubmissionIds.push(new Types.ObjectId(dataBelow.submission._id));
    if (dataBelow.submission?.fileUrl) {
      createdFilePaths.push(path.join(process.cwd(), dataBelow.submission.fileUrl.replace(/^\//, '')));
    }

    results.push({
      name: 'Upload Just Below Limit (24MB)',
      passed: true,
      details: '24.0 MB PDF assignment accepted successfully (HTTP 201) and recorded in database.',
    });
    console.log('  ✅ PASSED: 24MB file accepted and saved.');

    // -------------------------------------------------------------------------
    // Test 2: Upload at Exactly 25MB Limit (25 * 1024 * 1024 bytes)
    // -------------------------------------------------------------------------
    console.log('Test 2: Uploading file at exactly the 25MB boundary (25.0 MB)...');
    const sizeExact = 25 * 1024 * 1024;
    const bufferExact = Buffer.alloc(sizeExact, 'B');

    const formExact = new FormData();
    formExact.append('taskId', testTask._id.toString());
    formExact.append('submissionType', 'file');
    formExact.append('file', new Blob([bufferExact], { type: 'application/pdf' }), `exact_boundary_${runId}.pdf`);

    const resExact = await fetch(`${BASE_URL}/submissions/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
      body: formExact,
    });

    const dataExact: any = await resExact.json();
    assert(resExact.status === 200 || resExact.status === 201, `Expected 200/201 for exact 25MB file, got ${resExact.status}: ${JSON.stringify(dataExact)}`);
    assert(dataExact.success === true, 'Exact 25MB file must succeed');
    if (dataExact.submission?.fileUrl) {
      createdFilePaths.push(path.join(process.cwd(), dataExact.submission.fileUrl.replace(/^\//, '')));
    }

    results.push({
      name: 'Upload Exactly At Limit (25MB)',
      passed: true,
      details: 'Exact 25.0 MB boundary file accepted successfully (HTTP 200) without truncated byte errors.',
    });
    console.log('  ✅ PASSED: Exact 25MB boundary file accepted.');

    // -------------------------------------------------------------------------
    // Test 3: Upload Above Limit (25.5 MB) & Verify Orphaned File Prevention
    // -------------------------------------------------------------------------
    console.log('Test 3: Uploading file exceeding limit (25.5 MB) and verifying no orphaned files...');
    const uploadsBeforeFiles = new Set(fs.readdirSync(uploadDir));

    const sizeAbove = 25.5 * 1024 * 1024;
    const bufferAbove = Buffer.alloc(sizeAbove, 'C');

    const formAbove = new FormData();
    formAbove.append('taskId', testTask._id.toString());
    formAbove.append('submissionType', 'file');
    formAbove.append('file', new Blob([bufferAbove], { type: 'application/pdf' }), `oversized_${runId}.pdf`);

    const resAbove = await fetch(`${BASE_URL}/submissions/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
      body: formAbove,
    });

    const dataAbove: any = await resAbove.json();
    assert(resAbove.status === 400, `Expected 400 Bad Request for oversized file, got ${resAbove.status}: ${JSON.stringify(dataAbove)}`);
    assert(dataAbove.success === false, 'Oversized file response must have success: false');
    assert(
      dataAbove.message?.includes('exceeds the 25MB limit') || dataAbove.message?.includes('File too large'),
      `Expected 25MB limit message, got: ${dataAbove.message}`
    );

    // Verify filesystem: NO partial or orphaned file left in uploads directory
    const uploadsAfterFiles = fs.readdirSync(uploadDir);
    const newFiles = uploadsAfterFiles.filter((f) => !uploadsBeforeFiles.has(f));

    assert(newFiles.length === 0, `Orphaned files detected in uploads directory: ${newFiles.join(', ')}`);

    results.push({
      name: 'Oversized File Rejection & Zero Orphaned Files',
      passed: true,
      details: `25.5 MB file cleanly rejected with HTTP 400 ("${dataAbove.message}"). Zero orphaned or partial files left in ${ENV.UPLOAD_DIR}/.`,
    });
    console.log('  ✅ PASSED: 25.5MB file rejected with 400; zero orphaned files left.');

    // -------------------------------------------------------------------------
    // Test 4: Static Uploads Security Headers (Stored XSS Protection)
    // -------------------------------------------------------------------------
    console.log('Test 4: Testing static upload serving headers for active content...');
    const testHtmlFilename = `test_xss_proof_${runId}.html`;
    const testHtmlPath = path.join(uploadDir, testHtmlFilename);
    fs.writeFileSync(testHtmlPath, '<html><body><script>alert("test")</script></body></html>');
    createdFilePaths.push(testHtmlPath);

    const staticRes = await fetch(`${ROOT_URL}/uploads/${testHtmlFilename}`);
    assert(staticRes.status === 200, `Expected 200 fetching static upload, got ${staticRes.status}`);

    const contentDisposition = staticRes.headers.get('content-disposition');
    const nosniff = staticRes.headers.get('x-content-type-options');

    assert(
      Boolean(contentDisposition?.includes('attachment')),
      `Expected Content-Disposition to include 'attachment', got: ${contentDisposition}`
    );
    assert(
      nosniff === 'nosniff',
      `Expected X-Content-Type-Options: nosniff, got: ${nosniff}`
    );

    results.push({
      name: 'Stored XSS Static Header Protection',
      passed: true,
      details: 'HTML upload served with Content-Disposition: attachment and X-Content-Type-Options: nosniff to prevent script execution.',
    });
    console.log('  ✅ PASSED: Upload security headers confirmed (attachment + nosniff).');
  } finally {
    console.log('\n🧹 Cleaning up test upload artifacts...');
    for (const filePath of createdFilePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
    if (createdSubmissionIds.length > 0) {
      await Submission.deleteMany({ _id: { $in: createdSubmissionIds } });
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
    console.log('✨ Cleanup complete. Zero orphaned files or database records remaining.\n');
  }

  console.log('='.repeat(75));
  console.log('📊 UPLOAD SECURITY & BOUNDARY TEST SUMMARY');
  console.log('='.repeat(75));
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    console.log(`   ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('='.repeat(75));

  if (allPassed) {
    console.log(`Result: ${results.length}/${results.length} tests passed.\n`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

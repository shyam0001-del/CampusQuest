/**
 * CampusQuest Student Account Removal & Deactivation Automated Test Suite
 *
 * Verifies all security, safety, and data integrity criteria:
 * 1. Non-admin users (unauthenticated, students, faculty) cannot access removal endpoint
 * 2. Invalid ID formats and nonexistent users return proper HTTP error codes
 * 3. Administrators cannot delete their own account (self-deletion protection)
 * 4. Administrator cannot remove faculty or admin accounts (role protection)
 * 5. Successful student removal safely performs reversible deactivation
 * 6. Academic submissions and coin transactions are safely preserved for institutional audit trails
 * 7. Active course enrollments are cleaned up from Subject rosters
 * 8. Deactivated students cannot log in or use existing JWT tokens
 * 9. Deactivated students are excluded from active leaderboards and student directories
 * 10. Admin can successfully reactivate the student account and restore access
 * 11. Comprehensive AuditLog records are written for both deactivation and reactivation
 *
 * Strict constraint: Cleans up only temporary test documents created during this run.
 * Does NOT delete, reset, or alter any real user or task data.
 */

import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { Task } from '../models/Task';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { AuditLog } from '../models/AuditLog';
import { ENV } from '../config/env';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
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
  console.log('🛡️ CampusQuest Secure Student Account Removal Test Suite');
  console.log(`🌐 Target API: ${BASE_URL}`);
  console.log('='.repeat(75) + '\n');

  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const runId = `rm_${Date.now()}`;
  const createdUserIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];
  const createdTaskIds: Types.ObjectId[] = [];
  const createdSubmissionIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];

  try {
    // -----------------------------------------------------------------------
    // Setup Isolated Test Accounts
    // -----------------------------------------------------------------------
    const passwordHash = await bcrypt.hash('TestPassword123!', 10);

    const testAdmin = await User.create({
      name: `Test Admin ${runId}`,
      email: `admin_${runId}@internal.test`,
      passwordHash,
      role: 'admin',
      department: 'Administration',
    });
    createdUserIds.push(testAdmin._id);
    const adminToken = generateToken(testAdmin);

    const otherAdmin = await User.create({
      name: `Other Admin ${runId}`,
      email: `otheradmin_${runId}@internal.test`,
      passwordHash,
      role: 'admin',
      department: 'Administration',
    });
    createdUserIds.push(otherAdmin._id);

    const testFaculty = await User.create({
      name: `Test Faculty ${runId}`,
      email: `faculty_${runId}@internal.test`,
      passwordHash,
      role: 'faculty',
      facultyStatus: 'approved',
      department: 'Computer Science',
    });
    createdUserIds.push(testFaculty._id);
    const facultyToken = generateToken(testFaculty);

    const studentA = await User.create({
      name: `Test Student A ${runId}`,
      email: `studenta_${runId}@internal.test`,
      passwordHash,
      role: 'student',
      rollNumber: `CS${runId.slice(-4)}`,
      department: 'Computer Science',
      coins: 150,
      points: 150,
      xp: 200,
    });
    createdUserIds.push(studentA._id);
    const studentAToken = generateToken(studentA);

    const studentB = await User.create({
      name: `Test Student B ${runId}`,
      email: `studentb_${runId}@internal.test`,
      passwordHash,
      role: 'student',
      rollNumber: `CS${runId.slice(-4)}`, // Duplicate roll number match for studentA!
      department: 'Computer Science',
      coins: 80,
      points: 80,
    });
    createdUserIds.push(studentB._id);

    const testSubject = await Subject.create({
      name: `Removal Test Subject ${runId}`,
      code: `RM_${runId.slice(-6)}`,
      semester: 'Semester V',
      academicYear: '2026-2027',
      facultyName: 'Dr. Faculty',
      department: 'Computer Science',
      createdBy: testFaculty._id,
      enrolledStudents: [studentA._id, studentB._id],
    });
    createdSubjectIds.push(testSubject._id);

    const testTask = await Task.create({
      title: `Removal Test Task ${runId}`,
      description: 'Preservation test task',
      subject: testSubject._id,
      deadline: new Date(Date.now() + 86400000),
      maxBasePoints: 100,
      status: 'published',
      createdBy: testFaculty._id,
    });
    createdTaskIds.push(testTask._id);

    const testSubmission = await Submission.create({
      task: testTask._id,
      student: studentA._id,
      subject: testSubject._id,
      submissionType: 'text',
      textResponse: 'Academic coursework to preserve',
      rewardCoins: 100,
      rewardPoints: 100,
      status: 'submitted',
    });
    createdSubmissionIds.push(testSubmission._id);

    await CoinTransaction.create({
      student: studentA._id,
      task: testTask._id,
      amount: 100,
      type: 'base_reward',
      reason: 'Coursework submission base reward',
      balanceAfter: 150,
    });

    // -----------------------------------------------------------------------
    // Test 1: Non-Admin Access Restrictions (401 & 403)
    // -----------------------------------------------------------------------
    try {
      console.log('Test 1: Testing unauthorized and non-admin removal attempts...');

      // 1a. Unauthenticated request
      const noAuthRes = await apiRequest(`/users/${studentA._id}`, { method: 'DELETE' });
      assert(noAuthRes.status === 401, `Expected 401 for unauthenticated request, got ${noAuthRes.status}`);

      // 1b. Student token
      const studentRes = await apiRequest(`/users/${studentA._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${studentAToken}` },
      });
      assert(studentRes.status === 403, `Expected 403 for student request, got ${studentRes.status}`);

      // 1c. Faculty token
      const facultyRes = await apiRequest(`/users/${studentA._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${facultyToken}` },
      });
      assert(facultyRes.status === 403, `Expected 403 for faculty request, got ${facultyRes.status}`);

      results.push({
        num: 1,
        name: 'Non-Admin Access Restrictions',
        passed: true,
        details: 'Unauthenticated requests (401), student tokens (403), and faculty tokens (403) are strictly forbidden from calling DELETE /api/users/:id.',
      });
      console.log('  ✅ PASSED: Non-admin calls rejected with 401/403.\n');
    } catch (err: any) {
      results.push({ num: 1, name: 'Non-Admin Access Restrictions', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 2: Input Validation (Invalid ID and Nonexistent Student)
    // -----------------------------------------------------------------------
    try {
      console.log('Test 2: Testing invalid ID format and nonexistent student...');

      const invalidIdRes = await apiRequest('/users/not-a-valid-objectid', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(invalidIdRes.status === 400, `Expected 400 for invalid ID, got ${invalidIdRes.status}`);

      const randomId = new Types.ObjectId().toString();
      const notFoundRes = await apiRequest(`/users/${randomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(notFoundRes.status === 404, `Expected 404 for nonexistent student, got ${notFoundRes.status}`);

      results.push({
        num: 2,
        name: 'Input Validation',
        passed: true,
        details: 'Invalid ObjectId returns 400 Bad Request and nonexistent user returns 404 Not Found.',
      });
      console.log('  ✅ PASSED: ID validation returns 400/404 properly.\n');
    } catch (err: any) {
      results.push({ num: 2, name: 'Input Validation', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 3: Self-Deletion Protection
    // -----------------------------------------------------------------------
    try {
      console.log('Test 3: Testing admin self-deletion prevention...');

      const selfDeleteRes = await apiRequest(`/users/${testAdmin._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(selfDeleteRes.status === 400, `Expected 400 for self-deletion, got ${selfDeleteRes.status}`);
      assert(
        selfDeleteRes.data.message.includes('Administrators cannot remove their own account'),
        'Unexpected self-delete message'
      );

      // Verify admin account remains untouched
      const adminInDb = await User.findById(testAdmin._id);
      assert(adminInDb?.isActive !== false, 'Admin account was deactivated!');

      results.push({
        num: 3,
        name: 'Self-Deletion Protection',
        passed: true,
        details: 'Administrators are strictly prevented from deleting or deactivating their own account (400 Bad Request).',
      });
      console.log('  ✅ PASSED: Self-deletion rejected with 400 Bad Request.\n');
    } catch (err: any) {
      results.push({ num: 3, name: 'Self-Deletion Protection', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 4: Role Protection (Cannot Remove Admin or Faculty)
    // -----------------------------------------------------------------------
    try {
      console.log('Test 4: Testing role protection against removing faculty or other admins...');

      const deleteFacultyRes = await apiRequest(`/users/${testFaculty._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(deleteFacultyRes.status === 403, `Expected 403 when removing faculty, got ${deleteFacultyRes.status}`);

      const deleteAdminRes = await apiRequest(`/users/${otherAdmin._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(deleteAdminRes.status === 403, `Expected 403 when removing admin, got ${deleteAdminRes.status}`);

      results.push({
        num: 4,
        name: 'Role Protection',
        passed: true,
        details: 'Non-student accounts (faculty and administrators) are strictly protected against removal via DELETE /api/users/:id (403 Forbidden).',
      });
      console.log('  ✅ PASSED: Removal of faculty/admin rejected with 403 Forbidden.\n');
    } catch (err: any) {
      results.push({ num: 4, name: 'Role Protection', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 5: Successful Student Removal & Related Record Preservation
    // -----------------------------------------------------------------------
    try {
      console.log('Test 5: Testing successful student removal, unenrollment, and record preservation...');

      const removeRes = await apiRequest(`/users/${studentA._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Duplicate account registration' }),
      });
      assert(removeRes.status === 200, `Expected 200 for successful removal, got ${removeRes.status}`);
      assert(removeRes.data.success === true, 'Response success is not true');
      assert(removeRes.data.user.isActive === false, 'User isActive is not false in response');

      // 5a. Verify user record in MongoDB
      const studentAInDb = await User.findById(studentA._id);
      assert(studentAInDb?.isActive === false, 'User isActive is not false in database');
      assert(Boolean(studentAInDb?.deactivatedAt), 'User deactivatedAt timestamp missing');
      assert(
        studentAInDb?.deactivatedBy?.toString() === testAdmin._id.toString(),
        'User deactivatedBy does not match admin ID'
      );
      assert(
        studentAInDb?.deactivationReason === 'Duplicate account registration',
        'User deactivationReason mismatch'
      );

      // 5b. Verify academic submission preservation
      const submissionInDb = await Submission.findById(testSubmission._id);
      assert(Boolean(submissionInDb), 'Academic submission was deleted! It must be preserved.');

      // 5c. Verify coin transaction preservation
      const txCount = await CoinTransaction.countDocuments({ student: studentA._id });
      assert(txCount > 0, 'Coin transactions were deleted! Financial ledger must be preserved.');

      // 5d. Verify Subject unenrollment
      const subjectInDb = await Subject.findById(testSubject._id);
      const isStillEnrolled = subjectInDb?.enrolledStudents.some((id) => id.toString() === studentA._id.toString());
      assert(!isStillEnrolled, 'Student was not unenrolled from Subject.enrolledStudents!');
      // Student B must still be enrolled
      const isStudentBEnrolled = subjectInDb?.enrolledStudents.some((id) => id.toString() === studentB._id.toString());
      assert(Boolean(isStudentBEnrolled), 'Student B was accidentally unenrolled!');

      // 5e. Verify AuditLog entry
      const auditLog = await AuditLog.findOne({
        action: 'STUDENT_ACCOUNT_REMOVED',
        targetId: studentA._id.toString(),
      });
      assert(Boolean(auditLog), 'AuditLog entry was not created for student removal!');
      if (auditLog) createdAuditLogIds.push(auditLog._id);

      results.push({
        num: 5,
        name: 'Student Removal & Record Preservation',
        passed: true,
        details: 'Student marked isActive: false, unenrolled from Subject, while all submissions, grades, and coin transactions were securely preserved. AuditLog recorded.',
      });
      console.log('  ✅ PASSED: Student safely deactivated, unenrolled, and historical records preserved.\n');
    } catch (err: any) {
      results.push({ num: 5, name: 'Student Removal & Record Preservation', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 6: Access Revocation (Cannot Login or Use Token)
    // -----------------------------------------------------------------------
    try {
      console.log('Test 6: Testing access revocation for deactivated student...');

      // 6a. Attempt to log in with valid password
      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: studentA.email,
          password: 'TestPassword123!',
        }),
      });
      assert(loginRes.status === 403, `Expected 403 on login for deactivated student, got ${loginRes.status}`);
      assert(
        loginRes.data.message.includes('deactivated'),
        `Expected deactivated message on login, got: ${loginRes.data.message}`
      );

      // 6b. Attempt to call authenticated endpoint with pre-existing token
      const authEndpointRes = await apiRequest('/submissions/my-submissions', {
        headers: { Authorization: `Bearer ${studentAToken}` },
      });
      assert(
        authEndpointRes.status === 403,
        `Expected 403 when using existing token for deactivated student, got ${authEndpointRes.status}`
      );

      results.push({
        num: 6,
        name: 'Access Revocation',
        passed: true,
        details: 'Deactivated students cannot log in (403 Forbidden) and pre-existing JWT tokens are rejected by auth middleware (403 Forbidden).',
      });
      console.log('  ✅ PASSED: Deactivated student login and token access completely blocked.\n');
    } catch (err: any) {
      results.push({ num: 6, name: 'Access Revocation', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 7: Leaderboard & Student List Exclusion
    // -----------------------------------------------------------------------
    try {
      console.log('Test 7: Testing leaderboard and active student list exclusion...');

      // 7a. Global leaderboard
      const leaderboardRes = await apiRequest('/leaderboard?period=all_time', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(leaderboardRes.status === 200, `Leaderboard request failed with ${leaderboardRes.status}`);
      const leaderboardUsers = leaderboardRes.data.leaderboard || [];
      const inLeaderboard = leaderboardUsers.some(
        (entry: any) => entry.student?.email === studentA.email || entry.student?._id === studentA._id.toString()
      );
      assert(!inLeaderboard, 'Deactivated student appeared in active leaderboard rankings!');

      // 7b. Active student list (/api/users/students)
      const studentListRes = await apiRequest('/users/students', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(studentListRes.status === 200, `Student list request failed with ${studentListRes.status}`);
      const studentsList = studentListRes.data.students || [];
      const inStudentList = studentsList.some((s: any) => s.email === studentA.email);
      assert(!inStudentList, 'Deactivated student appeared in active student directory!');

      results.push({
        num: 7,
        name: 'Rankings & Roster Exclusion',
        passed: true,
        details: 'Deactivated students are cleanly excluded from active leaderboards and general student directory queries.',
      });
      console.log('  ✅ PASSED: Deactivated student hidden from active leaderboards and rosters.\n');
    } catch (err: any) {
      results.push({ num: 7, name: 'Rankings & Roster Exclusion', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 8: Reversible Reactivation
    // -----------------------------------------------------------------------
    try {
      console.log('Test 8: Testing admin reactivation of student account...');

      const reactivateRes = await apiRequest(`/users/${studentA._id}/reactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(reactivateRes.status === 200, `Expected 200 on reactivate, got ${reactivateRes.status}`);
      assert(reactivateRes.data.user.isActive === true, 'User isActive is not true after reactivation');

      // Verify student can log in again
      const reloginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: studentA.email,
          password: 'TestPassword123!',
        }),
      });
      assert(reloginRes.status === 200, `Re-login failed after reactivation with ${reloginRes.status}`);
      assert(Boolean(reloginRes.data.token), 'Missing token after reactivation login');

      // Verify AuditLog for reactivation
      const reactivateLog = await AuditLog.findOne({
        action: 'STUDENT_ACCOUNT_REACTIVATED',
        targetId: studentA._id.toString(),
      });
      assert(Boolean(reactivateLog), 'Missing AuditLog for STUDENT_ACCOUNT_REACTIVATED');
      if (reactivateLog) createdAuditLogIds.push(reactivateLog._id);

      results.push({
        num: 8,
        name: 'Account Reactivation',
        passed: true,
        details: 'Admin can cleanly reactivate deactivated students via PATCH /api/users/:id/reactivate. Login access is restored and audit trail recorded.',
      });
      console.log('  ✅ PASSED: Reactivation successfully restored student access and login.\n');
    } catch (err: any) {
      results.push({ num: 8, name: 'Account Reactivation', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }
  } finally {
    console.log('🧹 Cleaning up temporary test records...');
    if (createdAuditLogIds.length > 0) {
      await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
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
      await CoinTransaction.deleteMany({ student: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    console.log('✨ Cleanup complete. Zero real accounts or academic records modified.\n');

    await mongoose.disconnect();
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('='.repeat(75));
  console.log('📊 STUDENT ACCOUNT REMOVAL & SECURITY TEST SUMMARY');
  console.log('='.repeat(75));
  results.forEach((r) => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Test ${r.num}: ${r.name}`);
    console.log(`       ${r.details}`);
  });
  console.log('='.repeat(75));

  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`Result: ${totalPassed}/${results.length} tests passed.\n`);

  if (totalPassed < results.length) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

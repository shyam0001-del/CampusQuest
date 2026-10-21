/**
 * CampusQuest Security & Role-Based Authorization Automated Test Suite
 *
 * Verifies all 8 security criteria using isolated test fixtures and deterministic cleanup:
 * 1. Newly registered student cannot access admin APIs
 * 2. Pending faculty account cannot create tasks or subjects
 * 3. Administrator can approve faculty requests and audit log is recorded
 * 4. Approved faculty member can perform authorized faculty actions but NOT admin actions
 * 5. Student cannot change their role or coins by editing an API request (PUT /api/auth/profile)
 * 6. Faculty member cannot grant themselves admin privileges
 * 7. Public registration cannot create an admin account (sanitized to student)
 * 8. Safe behavior of public/protected core endpoints & demo login endpoints
 */

import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { Subject } from '../models/Subject';
import { AuditLog } from '../models/AuditLog';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
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
  console.log('='.repeat(70));
  console.log('🛡️  CampusQuest Authorization & Security Test Suite');
  console.log(`🌐  Target API: ${BASE_URL}`);
  console.log('='.repeat(70) + '\n');

  if (!ENV.MONGODB_URI) {
    throw new Error('MONGODB_URI missing from environment.');
  }

  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const runId = `sec_${Date.now()}`;
  const createdUserIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];
  const createdAuditLogIds: Types.ObjectId[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup Isolated Test Admin Fixture
    // -------------------------------------------------------------------------
    const passwordHash = await bcrypt.hash('TestAdminPass123!', 10);
    const testAdmin = await User.create({
      name: `Security Admin ${runId}`,
      email: `admin_${runId}@security.test`,
      passwordHash,
      role: 'admin',
      department: 'Academic Operations',
    });
    createdUserIds.push(testAdmin._id);
    const adminToken = generateToken(testAdmin);

    // =========================================================================
    // Test 1: A newly registered student cannot access admin APIs
    // =========================================================================
    try {
      const studentEmail = `student_${runId}@campusquest.test`;
      const regRes = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Student Security',
          email: studentEmail,
          password: 'Password@123',
          accountType: 'student',
          department: 'Computer Science',
          year: '3rd Year',
        }),
      });

      assert(regRes.status === 201, `Student registration failed: ${JSON.stringify(regRes.data)}`);
      assert(regRes.data.user.role === 'student', 'Registered user must have student role');
      const studentToken = regRes.data.token;
      if (regRes.data.user.id) createdUserIds.push(new Types.ObjectId(regRes.data.user.id));

      // Try accessing admin audit logs
      const auditRes = await apiRequest('/users/audit-logs', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert(auditRes.status === 403, `Expected 403 accessing /audit-logs, got ${auditRes.status}`);

      // Try accessing pending faculty queue
      const pendingRes = await apiRequest('/auth/faculty/pending', {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert(pendingRes.status === 403, `Expected 403 accessing /faculty/pending, got ${pendingRes.status}`);

      results.push({
        num: 1,
        name: 'Newly registered student cannot access admin APIs',
        passed: true,
        details: 'Student received 403 Forbidden on both /api/users/audit-logs and /api/auth/faculty/pending',
      });
    } catch (err: any) {
      results.push({
        num: 1,
        name: 'Newly registered student cannot access admin APIs',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 2: A pending faculty account cannot create tasks or subjects
    // =========================================================================
    let pendingFacultyToken = '';
    let pendingFacultyId = '';
    const facultyEmail = `faculty_${runId}@campusquest.test`;

    try {
      const regRes = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Prof. Test Pending',
          email: facultyEmail,
          password: 'Password@123',
          accountType: 'faculty',
          designation: 'Assistant Professor',
          department: 'Computer Science',
        }),
      });

      assert(regRes.status === 201, `Faculty registration failed: ${JSON.stringify(regRes.data)}`);
      assert(regRes.data.user.role === 'faculty', 'Must have faculty role');
      assert(regRes.data.user.approvalStatus === 'pending', 'Must have pending approvalStatus');
      pendingFacultyToken = regRes.data.token;
      pendingFacultyId = regRes.data.user.id;
      if (pendingFacultyId) createdUserIds.push(new Types.ObjectId(pendingFacultyId));

      // Attempt to create a task as pending faculty
      const taskRes = await apiRequest('/tasks', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pendingFacultyToken}` },
        body: JSON.stringify({
          title: 'Unauthorized Task',
          description: 'Should be rejected',
          subjectId: '507f1f77bcf86cd799439011',
          deadline: new Date(Date.now() + 86400000).toISOString(),
          totalPoints: 100,
          coinReward: 50,
        }),
      });
      assert(taskRes.status === 403, `Expected 403 creating task, got ${taskRes.status}`);
      assert(taskRes.data.pendingApproval === true, 'Response must indicate pending approval');

      // Attempt to create a subject as pending faculty
      const subjRes = await apiRequest('/subjects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pendingFacultyToken}` },
        body: JSON.stringify({
          name: 'Unauthorized Subject',
          code: `CS${runId.slice(-4)}`,
          department: 'CSE',
        }),
      });
      assert(subjRes.status === 403, `Expected 403 creating subject, got ${subjRes.status}`);
      assert(subjRes.data.pendingApproval === true, 'Subject response must indicate pending approval');

      results.push({
        num: 2,
        name: 'Pending faculty account cannot create tasks or subjects',
        passed: true,
        details: 'Pending faculty blocked with 403 Forbidden and pendingApproval: true on POST /api/tasks and /api/subjects',
      });
    } catch (err: any) {
      results.push({
        num: 2,
        name: 'Pending faculty account cannot create tasks or subjects',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 3: Administrator can approve faculty requests
    // =========================================================================
    try {
      // Admin fetches pending faculty list
      const pendingListRes = await apiRequest('/auth/faculty/pending', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(pendingListRes.status === 200, 'Admin should fetch pending faculty');
      assert(Array.isArray(pendingListRes.data.pendingFaculty), 'Pending list must be an array');
      const foundApplicant = pendingListRes.data.pendingFaculty.some((f: any) => f._id === pendingFacultyId);
      assert(foundApplicant, 'Newly created pending faculty must appear in pending queue');

      // Admin approves the pending faculty
      const approveRes = await apiRequest(`/auth/faculty/${pendingFacultyId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(approveRes.status === 200, `Faculty approval failed: ${JSON.stringify(approveRes.data)}`);
      assert(approveRes.data.faculty.approvalStatus === 'approved', 'Faculty status must now be approved');

      // Check audit logs
      const auditRes = await apiRequest('/users/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(auditRes.status === 200, 'Admin can view audit logs');
      const hasLog = auditRes.data.logs.some((l: any) => l.action === 'APPROVE_FACULTY');
      assert(hasLog, 'Audit log must record APPROVE_FACULTY action');

      results.push({
        num: 3,
        name: 'Administrator can approve faculty requests',
        passed: true,
        details: 'Admin verified pending queue, approved applicant, and verified APPROVE_FACULTY audit log entry',
      });
    } catch (err: any) {
      results.push({
        num: 3,
        name: 'Administrator can approve faculty requests',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 4: Approved faculty member can perform only authorized faculty actions
    // =========================================================================
    try {
      // The faculty member logs in fresh now that they are approved
      const facLoginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: facultyEmail,
          password: 'Password@123',
        }),
      });
      assert(facLoginRes.status === 200, 'Approved faculty should be able to log in');
      assert(facLoginRes.data.user.approvalStatus === 'approved', 'User status should be approved');
      const approvedFacToken = facLoginRes.data.token;

      // Create an authorized subject
      const subjRes = await apiRequest('/subjects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${approvedFacToken}` },
        body: JSON.stringify({
          name: `Distributed Systems Test ${runId}`,
          code: `CS${runId.slice(-4)}`,
          department: 'Computer Science & Engineering',
          semester: 'Semester VI',
          academicYear: '2026-2027',
        }),
      });
      assert(subjRes.status === 201, `Approved faculty should create subject, got ${subjRes.status}: ${JSON.stringify(subjRes.data)}`);
      if (subjRes.data.subject?._id) createdSubjectIds.push(new Types.ObjectId(subjRes.data.subject._id));

      // Attempt unauthorized administrative action (view audit logs)
      const auditRes = await apiRequest('/users/audit-logs', {
        headers: { Authorization: `Bearer ${approvedFacToken}` },
      });
      assert(auditRes.status === 403, `Faculty must receive 403 on /audit-logs, got ${auditRes.status}`);

      // Attempt unauthorized administrative action (approve other faculty)
      const rogueApproveRes = await apiRequest(`/auth/faculty/${pendingFacultyId}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${approvedFacToken}` },
      });
      assert(rogueApproveRes.status === 403, `Faculty must receive 403 on approving others, got ${rogueApproveRes.status}`);

      results.push({
        num: 4,
        name: 'Approved faculty member can perform only authorized faculty actions',
        passed: true,
        details: 'Approved faculty created subject successfully (201), but received 403 Forbidden on admin audit logs and approval routes',
      });
    } catch (err: any) {
      results.push({
        num: 4,
        name: 'Approved faculty member can perform only authorized faculty actions',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 5: A student cannot change their role by editing an API request
    // =========================================================================
    try {
      const studentLogin = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: `student_${runId}@campusquest.test`,
          password: 'Password@123',
        }),
      });
      const studentToken = studentLogin.data.token;
      const initialCoins = studentLogin.data.user.coins;

      // Attempt privilege escalation: student tries to set role to "admin" and coins to 99999
      const exploitRes = await apiRequest('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${studentToken}` },
        body: JSON.stringify({
          name: 'Hacked Student',
          role: 'admin',
          coins: 99999,
          approvalStatus: 'approved',
        }),
      });

      assert(exploitRes.status === 200, `Profile update returned ${exploitRes.status}`);
      assert(exploitRes.data.user.role === 'student', 'Role must remain student');
      assert(exploitRes.data.user.coins === initialCoins, 'Coins must not be modified via profile update');

      // Verify at the database level as well
      const userDoc = await User.findOne({ email: `student_${runId}@campusquest.test` });
      assert(userDoc?.role === 'student', 'DB check: Role must remain student');
      assert(userDoc?.coins === initialCoins, 'DB check: Coins must remain unchanged');

      results.push({
        num: 5,
        name: 'Student cannot change their role or coins by editing an API request',
        passed: true,
        details: `PUT /api/auth/profile rejected role & coin tampering; role remains student and coins remain unchanged (${initialCoins})`,
      });
    } catch (err: any) {
      results.push({
        num: 5,
        name: 'Student cannot change their role or coins by editing an API request',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 6: A faculty member cannot grant themselves admin privileges
    // =========================================================================
    try {
      const facLogin = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: facultyEmail,
          password: 'Password@123',
        }),
      });
      const facToken = facLogin.data.token;

      // Faculty attempts to escalate to admin
      const exploitRes = await apiRequest('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${facToken}` },
        body: JSON.stringify({
          role: 'admin',
        }),
      });

      assert(exploitRes.status === 200, `Profile update returned ${exploitRes.status}`);
      assert(exploitRes.data.user.role === 'faculty', 'Role must remain faculty');

      // Confirm with DB
      const facDoc = await User.findOne({ email: facultyEmail });
      assert(facDoc?.role === 'faculty', 'DB check: Role must remain faculty');

      results.push({
        num: 6,
        name: 'Faculty member cannot grant themselves admin privileges',
        passed: true,
        details: 'Faculty escalation attempt safely disregarded; role remains faculty',
      });
    } catch (err: any) {
      results.push({
        num: 6,
        name: 'Faculty member cannot grant themselves admin privileges',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 7: Public registration cannot create an admin account
    // =========================================================================
    try {
      const exploitEmail = `hacker_${runId}@evil.test`;
      const exploitRes = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Rogue Admin Candidate',
          email: exploitEmail,
          password: 'Password@123',
          role: 'admin', // Attack payload: attempting to inject admin role
          approvalStatus: 'approved',
        }),
      });
      assert(exploitRes.status === 201, `Registration returned status ${exploitRes.status}`);
      assert(exploitRes.data.user.role === 'student', `Role was set to ${exploitRes.data.user.role}, expected student`);
      if (exploitRes.data.user.id) createdUserIds.push(new Types.ObjectId(exploitRes.data.user.id));

      // Verify token received cannot access admin routes
      const hackerToken = exploitRes.data.token;
      const adminCheck = await apiRequest('/users/audit-logs', {
        headers: { Authorization: `Bearer ${hackerToken}` },
      });
      assert(adminCheck.status === 403, `Attacker gained access to /audit-logs with status ${adminCheck.status}`);

      results.push({
        num: 7,
        name: 'Public registration cannot create an admin account',
        passed: true,
        details: 'Injected role: "admin" was sanitized to "student"; attacker received 403 Forbidden on admin APIs',
      });
    } catch (err: any) {
      results.push({
        num: 7,
        name: 'Public registration cannot create an admin account',
        passed: false,
        details: err.message,
      });
    }

    // =========================================================================
    // Test 8: Safe behavior of core public & protected endpoints & demo logins
    // =========================================================================
    try {
      // 1. Verify /tasks and /leaderboard respond with status 200
      const tasksRes = await apiRequest('/tasks');
      assert(tasksRes.status === 200, 'GET /tasks should succeed');
      assert(Array.isArray(tasksRes.data.tasks), 'tasks should be an array');

      const leaderboardRes = await apiRequest('/leaderboard');
      assert(leaderboardRes.status === 200, 'GET /leaderboard should succeed');
      assert(Array.isArray(leaderboardRes.data.leaderboard), 'leaderboard should be an array');

      // 2. Verify demo login endpoints enforce production / non-demo boundaries safely
      const demoRes = await apiRequest('/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role: 'student' }),
      });

      if (ENV.NODE_ENV === 'production') {
        assert(demoRes.status === 403, 'Demo login must return 403 in production');
      } else {
        // In development without seeded demo accounts, it must return 404 or 200 (not 500)
        assert(demoRes.status === 404 || demoRes.status === 200, `Demo login returned unexpected status ${demoRes.status}`);
      }

      results.push({
        num: 8,
        name: 'Core feature endpoints and demo login boundaries are safe',
        passed: true,
        details: `/tasks & /leaderboard endpoints healthy (200 OK); demo login safely handled without server error (${demoRes.status})`,
      });
    } catch (err: any) {
      results.push({
        num: 8,
        name: 'Core feature endpoints and demo login boundaries are safe',
        passed: false,
        details: err.message,
      });
    }
  } finally {
    console.log('\n🧹 Cleaning up temporary security test fixtures...');
    if (createdSubjectIds.length > 0) {
      await Subject.deleteMany({ _id: { $in: createdSubjectIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    // Delete any test audit logs generated by this run
    await AuditLog.deleteMany({ performedBy: { $in: createdUserIds } });

    await mongoose.disconnect();
    console.log('✨ Cleanup complete. Zero real accounts or academic records modified.\n');
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('='.repeat(70));
  console.log('📊  TEST RESULTS SUMMARY');
  console.log('='.repeat(70));
  let allPassed = true;
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} Test ${r.num}: ${r.name}`);
    console.log(`   ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log('='.repeat(70));
  if (allPassed) {
    console.log('🎉 ALL 8 SECURITY TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error('⚠️ ONE OR MORE SECURITY TESTS FAILED.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

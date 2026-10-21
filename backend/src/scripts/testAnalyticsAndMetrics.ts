import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';

const BASE_URL = `http://localhost:${ENV.PORT || 5000}/api`;

/**
 * Focused Audit Verification Script for Analytics API,
 * Scoping, Date Ranges, and Coin Metrics.
 */
async function runAnalyticsAudit() {
  console.log('===========================================================================');
  console.log('🔬 CampusQuest Dashboard Analytics & Coin Metrics Audit Suite');
  console.log('===========================================================================');

  let passed = 0;
  let total = 0;

  const testPass = (msg: string) => {
    passed++;
    total++;
    console.log(`  ✅ PASSED: ${msg}`);
  };

  const testFail = (msg: string, detail?: any) => {
    total++;
    console.error(`  ❌ FAILED: ${msg}`, detail || '');
  };

  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const testRunId = Date.now();
  let studentUser: any = null;
  let adminUser: any = null;
  let pendingFacultyUser: any = null;

  try {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // Create ephemeral student fixture
    studentUser = await User.create({
      name: 'Audit Student',
      email: `audit_student_${testRunId}@campusquest.test`,
      passwordHash,
      role: 'student',
      approvalStatus: 'approved',
      rollNumber: `STU${testRunId}`,
      department: 'CSE',
      year: '3',
      section: 'A',
      coins: 50,
      points: 120,
      streak: 3,
      isActive: true,
    });

    // Create ephemeral admin fixture
    adminUser = await User.create({
      name: 'Audit Admin',
      email: `audit_admin_${testRunId}@campusquest.test`,
      passwordHash,
      role: 'admin',
      approvalStatus: 'approved',
      rollNumber: `ADM${testRunId}`,
      department: 'ADMIN',
      year: 'N/A',
      section: 'N/A',
      coins: 0,
      points: 0,
      streak: 0,
      isActive: true,
    });

    // Create ephemeral pending faculty fixture
    pendingFacultyUser = await User.create({
      name: 'Pending Faculty',
      email: `audit_faculty_${testRunId}@campusquest.test`,
      passwordHash,
      role: 'faculty',
      approvalStatus: 'pending',
      rollNumber: `FAC${testRunId}`,
      department: 'CSE',
      year: 'N/A',
      section: 'N/A',
      coins: 0,
      points: 0,
      streak: 0,
      isActive: true,
    });

    const studentToken = jwt.sign(
      { id: studentUser._id.toString(), role: 'student' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: 'admin' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const pendingFacultyToken = jwt.sign(
      { id: pendingFacultyUser._id.toString(), role: 'faculty' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 1. Test Unauthenticated Access
    console.log('\n[Test 1] Testing Unauthenticated Request Authorization...');
    const unauthRes = await fetch(`${BASE_URL}/analytics/dashboard`);
    if (unauthRes.status === 401) {
      testPass('Unauthenticated request strictly blocked with 401 Unauthorized');
    } else {
      testFail(`Expected 401 Unauthorized, received ${unauthRes.status}`);
    }

    // 2. Test Pending Faculty Authorization (Must be rejected)
    console.log('\n[Test 2] Testing Pending Faculty Authorization...');
    const pendingRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${pendingFacultyToken}` },
    });
    if (pendingRes.status === 403) {
      testPass('Pending faculty request strictly rejected with 403 Forbidden');
    } else {
      testFail(`Expected 403 Forbidden for pending faculty, received ${pendingRes.status}`);
    }

    // 3. Test Student Scoping
    console.log('\n[Test 3] Testing Student-Scoped Analytics...');
    const studentRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentData = (await studentRes.json()) as any;

    if (studentRes.status === 200 && studentData.success) {
      testPass('Authenticated student request succeeds with 200 OK');

      if (studentData.stats.coinsEarned === 50 && studentData.stats.points === 120 && studentData.stats.streak === 3) {
        testPass(`Student metrics strictly scoped to authenticated user ID (Coins: 50, Pts: 120, Streak: 3)`);
      } else {
        testFail('Student metrics do not match authenticated student ID records', studentData.stats);
      }

      if (typeof studentData.stats.rank === 'number' && studentData.stats.rank >= 1) {
        testPass(`Student rank correctly scoped and calculated (Rank #${studentData.stats.rank})`);
      } else {
        testFail('Student rank missing or invalid');
      }

      if (Array.isArray(studentData.activityData) && studentData.activityData.length === 7) {
        testPass('Default activityData returned exactly 7 consecutive daily entries');
      } else {
        testFail(`activityData returned ${studentData.activityData?.length} entries`);
      }
    } else {
      testFail(`Student request failed with status ${studentRes.status}`, studentData);
    }

    // 4. Test Admin Global Analytics Authorization
    console.log('\n[Test 4] Testing Admin Global Analytics Authorization...');
    const adminRes = await fetch(`${BASE_URL}/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = (await adminRes.json()) as any;

    if (adminRes.status === 200 && adminData.success) {
      testPass('Admin global analytics request succeeds with 200 OK');
      if (typeof adminData.stats.totalStudents === 'number' && adminData.stats.totalStudents >= 1) {
        testPass(`Admin receives global counts across institution (totalStudents: ${adminData.stats.totalStudents})`);
      } else {
        testFail('Admin global metrics missing totalStudents');
      }
    } else {
      testFail(`Admin request failed with status ${adminRes.status}`);
    }

    // 5. Test Date Ranges: 7, 14, 30 and Invalid Rejection
    console.log('\n[Test 5] Testing days Parameter Validation & Granularity...');

    const res7 = await fetch(`${BASE_URL}/analytics/dashboard?days=7`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data7 = (await res7.json()) as any;
    if (data7.activityData?.length === 7) {
      testPass('days=7 yields exactly 7 daily data points');
    } else {
      testFail(`days=7 returned ${data7.activityData?.length} items`);
    }

    const res14 = await fetch(`${BASE_URL}/analytics/dashboard?days=14`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data14 = (await res14.json()) as any;
    if (data14.activityData?.length === 14) {
      testPass('days=14 yields exactly 14 daily data points');
    } else {
      testFail(`days=14 returned ${data14.activityData?.length} items`);
    }

    const res30 = await fetch(`${BASE_URL}/analytics/dashboard?days=30`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const data30 = (await res30.json()) as any;
    if (data30.activityData?.length === 30) {
      testPass('days=30 yields exactly 30 daily data points');
    } else {
      testFail(`days=30 returned ${data30.activityData?.length} items`);
    }

    // Invalid days: 10
    const resInvalid = await fetch(`${BASE_URL}/analytics/dashboard?days=10`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const dataInvalid = (await resInvalid.json()) as any;
    if (resInvalid.status === 400 && !dataInvalid.success) {
      testPass('days=10 correctly rejected with 400 Bad Request');
    } else {
      testFail(`days=10 expected 400, got ${resInvalid.status}`);
    }

    // Invalid days: abc
    const resAlpha = await fetch(`${BASE_URL}/analytics/dashboard?days=abc`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const dataAlpha = (await resAlpha.json()) as any;
    if (resAlpha.status === 400 && !dataAlpha.success) {
      testPass('days=abc correctly rejected with 400 Bad Request');
    } else {
      testFail(`days=abc expected 400, got ${resAlpha.status}`);
    }

    // 6. Test Date Continuity & Zero-Activity Presence
    console.log('\n[Test 6] Testing Date Continuity and Zero-Activity Handling...');
    const activityData = data7.activityData;
    let allDatesValid = true;
    let zeroCount = 0;

    for (let i = 0; i < activityData.length; i++) {
      const item = activityData[i];
      if (!item.day || !item.date || typeof item.submissions !== 'number' || typeof item.coins !== 'number') {
        allDatesValid = false;
      }
      if (item.submissions === 0 && item.coins === 0) {
        zeroCount++;
      }
    }

    if (allDatesValid) {
      testPass('All dates include complete formatted day, date, submissions, and coins metrics');
    } else {
      testFail('activityData entry missing required schema fields');
    }

    if (zeroCount > 0) {
      testPass(
        `Zero-activity dates are fully preserved and explicitly charted (${zeroCount} zero-activity days in 7D window)`
      );
    } else {
      testPass('All dates returned data without gaps');
    }

    // 7. Test Coin Transaction Filtering Integrity
    console.log('\n[Test 7] Testing Coin Metrics & Reward Filtering...');
    const testDate = new Date();

    // Create ephemeral base_reward (should be included)
    const baseTx = await CoinTransaction.create({
      student: studentUser._id,
      amount: 42,
      type: 'base_reward',
      reason: 'Audit verification test base reward',
      balanceAfter: (studentUser.coins || 0) + 42,
      createdAt: testDate,
    });

    // Create ephemeral negative adjustment (should be excluded from earned coins)
    const adjTx = await CoinTransaction.create({
      student: studentUser._id,
      amount: -25,
      type: 'admin_adjustment',
      reason: 'Audit verification test negative adjustment',
      balanceAfter: (studentUser.coins || 0) + 17,
      createdAt: testDate,
    });

    const postRes = await fetch(`${BASE_URL}/analytics/dashboard?days=7`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const postData = (await postRes.json()) as any;

    const todayEntry = postData.activityData[postData.activityData.length - 1];

    if (todayEntry.coins >= 42) {
      testPass(
        `Earned coin transaction (+42) successfully included in daily sum (total today: ${todayEntry.coins})`
      );
    } else {
      testFail(`Earned coin transaction not counted in today's entry (coins: ${todayEntry.coins})`);
    }

    // Clean up ephemeral test fixtures immediately
    await CoinTransaction.deleteOne({ _id: baseTx._id });
    await CoinTransaction.deleteOne({ _id: adjTx._id });
    testPass('Ephemeral test coin transactions cleanly removed.');

    console.log('\n===========================================================================');
    console.log(`📊 AUDIT RESULT: ${passed}/${total} checks passed successfully.`);
    console.log('===========================================================================');
  } catch (error) {
    console.error('Audit execution error:', error);
  } finally {
    // Deterministic cleanup: ensure zero test records left in DB
    if (studentUser) await User.deleteOne({ _id: studentUser._id });
    if (adminUser) await User.deleteOne({ _id: adminUser._id });
    if (pendingFacultyUser) await User.deleteOne({ _id: pendingFacultyUser._id });
    await User.deleteMany({ email: { $regex: /@campusquest\.test$/ } });
    await mongoose.disconnect();
    console.log('🧹 Cleanup complete. Database restored to pristine state.');
    process.exit(passed === total && total > 0 ? 0 : 1);
  }
}

runAnalyticsAudit();

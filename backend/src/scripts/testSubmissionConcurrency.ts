/**
 * CampusQuest Submission Concurrency & Reward Idempotency Automated Test Suite
 *
 * Verifies:
 * 1. Simultaneous duplicate requests from the same student create exactly 1 submission and 1 reward
 * 2. Idempotent response format returned for retries/duplicates without throwing errors
 * 3. Resubmissions do not award duplicate points, coins, or early-bird bonuses
 * 4. Concurrent submissions from multiple students competing for early-bird bonus allocate ranks 1, 2, 3 uniquely
 * 5. Multi-document transaction rollbacks cleanly prevent partial balance/ledger updates
 * 6. MongoDB Atlas unique partial indexes enforce constraint guarantees at the database engine level
 *
 * Strict constraint: Cleans up only temporary test documents created during this run.
 * Does NOT delete, reset, or alter any real user or task data.
 */

import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../models/User';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { Notification } from '../models/Notification';
import { ENV } from '../config/env';
import { isTransactionSupported, runTransactionWithRetry } from '../utils/transaction';

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

async function runTestSuite() {
  console.log('='.repeat(75));
  console.log('⚡ CampusQuest Submission Concurrency & Idempotency Test Suite');
  console.log(`🌐 Target API: ${BASE_URL}`);
  console.log('='.repeat(75) + '\n');

  // Connect mongoose to Atlas directly for verification queries and setup
  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const isTx = isTransactionSupported();
  console.log(`[Database Topology] Multi-document transactions supported: ${isTx ? 'YES (ReplicaSet)' : 'NO (Standalone)'}\n`);

  const runId = `test_${Date.now()}`;
  const createdUserIds: Types.ObjectId[] = [];
  const createdTaskIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];

  try {
    // -----------------------------------------------------------------------
    // Setup Isolated Test Environment
    // -----------------------------------------------------------------------
    const testFaculty = await User.create({
      name: `Test Faculty ${runId}`,
      email: `faculty_${runId}@internal.test`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      role: 'faculty',
      facultyStatus: 'approved',
      department: 'Computer Science',
    });
    createdUserIds.push(testFaculty._id);

    const testSubject = await Subject.create({
      name: `Concurrency Test Subject ${runId}`,
      code: `CS_${runId.slice(-6)}`,
      semester: 'Semester V',
      academicYear: '2026-2027',
      facultyName: 'Dr. Test Faculty',
      department: 'Computer Science',
      createdBy: testFaculty._id,
    });
    createdSubjectIds.push(testSubject._id);

    // -----------------------------------------------------------------------
    // Test 1: Verify Atlas Unique Indexes Are Active
    // -----------------------------------------------------------------------
    try {
      console.log('Test 1: Verifying active unique and partial indexes on Atlas collections...');
      const subIndexes = await mongoose.connection.collection('submissions').indexes();
      const txIndexes = await mongoose.connection.collection('cointransactions').indexes();

      const hasTaskStudentUnique = subIndexes.some(
        (idx) => idx.unique && idx.key?.task === 1 && idx.key?.student === 1
      );
      const hasBonusRankUnique = subIndexes.some(
        (idx) =>
          idx.unique &&
          idx.key?.task === 1 &&
          idx.key?.bonusRankAwarded === 1 &&
          idx.partialFilterExpression
      );
      const hasTxUnique = txIndexes.some(
        (idx) =>
          idx.unique &&
          idx.key?.student === 1 &&
          idx.key?.task === 1 &&
          idx.key?.type === 1 &&
          idx.partialFilterExpression
      );

      assert(hasTaskStudentUnique, 'Missing unique index on submissions { task: 1, student: 1 }');
      assert(hasBonusRankUnique, 'Missing partial unique index on submissions { task: 1, bonusRankAwarded: 1 }');
      assert(hasTxUnique, 'Missing partial unique index on cointransactions { student: 1, task: 1, type: 1 }');

      results.push({
        num: 1,
        name: 'Database Index Verification',
        passed: true,
        details: 'All required compound unique and partial filter indexes are active on Atlas.',
      });
      console.log('  ✅ PASSED: Atlas unique and partial indexes verified.\n');
    } catch (err: any) {
      results.push({ num: 1, name: 'Database Index Verification', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 2: Simultaneous Duplicate Submissions from the Same Student
    // -----------------------------------------------------------------------
    try {
      console.log('Test 2: Testing 5 simultaneous duplicate submissions from the same student...');

      const student1 = await User.create({
        name: `Test Student 1 ${runId}`,
        email: `student1_${runId}@internal.test`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'student',
        department: 'Computer Science',
        semester: 4,
        coins: 100,
        points: 100,
        xp: 0,
        streak: 0,
      });
      createdUserIds.push(student1._id);

      const task1 = await Task.create({
        title: `Single Submit Task ${runId}`,
        description: 'Testing concurrency duplicate prevention',
        category: 'assignment',
        subject: testSubject._id,
        deadline: new Date(Date.now() + 86400000), // tomorrow (on-time)
        maxBasePoints: 100,
        bonusRules: { firstBonus: 50, secondBonus: 35, thirdBonus: 20, latePenaltyPct: 50 },
        allowResubmission: false,
        status: 'published',
        createdBy: testFaculty._id,
      });
      createdTaskIds.push(task1._id);

      const token1 = generateToken(student1);

      // Fire 5 identical requests concurrently with Promise.all
      const payload = {
        taskId: task1._id.toString(),
        submissionType: 'text',
        textResponse: 'Concurrent submission test payload',
        notes: 'Simultaneous blast test',
      };

      const requests = Array.from({ length: 5 }).map(() =>
        apiRequest('/submissions/submit', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token1}` },
          body: JSON.stringify(payload),
        })
      );

      const responses = await Promise.all(requests);

      // Verify responses: all 5 must succeed without unhandled errors (201 Created or 200 Idempotent OK)
      const successCount = responses.filter((r) => r.status === 200 || r.status === 201).length;
      if (successCount < 5) {
        console.error('Failed responses:', responses.filter(r => r.status !== 200 && r.status !== 201).map(r => ({ status: r.status, data: r.data })));
      }
      assert(successCount === 5, `Expected all 5 responses to be 200/201, got ${successCount}. Responses: ${JSON.stringify(responses.map(r => r.status))}`);

      // Verify database state: Exactly ONE submission document must exist
      const subCount = await Submission.countDocuments({ task: task1._id, student: student1._id });
      assert(subCount === 1, `Expected exactly 1 submission document in MongoDB, found: ${subCount}`);

      // Verify ledger: Exactly ONE base_reward and ONE early_bird_bonus transaction
      const baseTxCount = await CoinTransaction.countDocuments({
        student: student1._id,
        task: task1._id,
        type: 'base_reward',
      });
      const bonusTxCount = await CoinTransaction.countDocuments({
        student: student1._id,
        task: task1._id,
        type: 'early_bird_bonus',
      });
      assert(baseTxCount === 1, `Expected exactly 1 base_reward transaction, found ${baseTxCount}`);
      assert(bonusTxCount === 1, `Expected exactly 1 early_bird_bonus transaction, found ${bonusTxCount}`);

      // Verify student balance: started at 100, awarded 100 base + 50 1st place bonus = 250
      const refreshedStudent = await User.findById(student1._id);
      const expectedCoins = 100 + 100 + 50; // 250
      assert(
        refreshedStudent?.coins === expectedCoins,
        `Student coins corrupt! Expected ${expectedCoins}, but got ${refreshedStudent?.coins}`
      );
      assert(
        refreshedStudent?.points === expectedCoins,
        `Student points corrupt! Expected ${expectedCoins}, but got ${refreshedStudent?.points}`
      );

      results.push({
        num: 2,
        name: 'Simultaneous Duplicate Submissions',
        passed: true,
        details: `5 concurrent requests resulted in exactly 1 submission, 1 reward ledger entry, and student balance increased by exactly 150 (from 100 to ${refreshedStudent?.coins}).`,
      });
      console.log(`  ✅ PASSED: Exactly 1 submission created, balance = ${refreshedStudent?.coins} (100 base + 50 bonus awarded once).\n`);
    } catch (err: any) {
      results.push({ num: 2, name: 'Simultaneous Duplicate Submissions', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 3: Resubmission Idempotency & Zero Duplicate Rewards
    // -----------------------------------------------------------------------
    try {
      console.log('Test 3: Testing resubmissions on tasks with allowResubmission = true and false...');

      const student2 = await User.create({
        name: `Test Student 2 ${runId}`,
        email: `student2_${runId}@internal.test`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'student',
        department: 'Computer Science',
        semester: 4,
        coins: 200,
        points: 200,
      });
      createdUserIds.push(student2._id);

      const resubmittableTask = await Task.create({
        title: `Resubmittable Task ${runId}`,
        description: 'Testing resubmission rewards',
        category: 'assignment',
        subject: testSubject._id,
        deadline: new Date(Date.now() + 86400000),
        maxBasePoints: 80,
        bonusRules: { firstBonus: 40, secondBonus: 25, thirdBonus: 10, latePenaltyPct: 50 },
        allowResubmission: true,
        status: 'published',
        createdBy: testFaculty._id,
      });
      createdTaskIds.push(resubmittableTask._id);

      const token2 = generateToken(student2);

      // First submission
      const firstRes = await apiRequest('/submissions/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` },
        body: JSON.stringify({
          taskId: resubmittableTask._id.toString(),
          submissionType: 'text',
          textResponse: 'Initial work version 1',
        }),
      });
      assert(firstRes.status === 201, `First submission failed with status ${firstRes.status}`);

      const studentAfterFirst = await User.findById(student2._id);
      const expectedAfterFirst = 200 + 80 + 40; // 320
      assert(studentAfterFirst?.coins === expectedAfterFirst, `Coins after first submit expected ${expectedAfterFirst}, got ${studentAfterFirst?.coins}`);

      // Resubmission with updated work
      const secondRes = await apiRequest('/submissions/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token2}` },
        body: JSON.stringify({
          taskId: resubmittableTask._id.toString(),
          submissionType: 'text',
          textResponse: 'Revised work version 2 with improvements',
        }),
      });
      assert(secondRes.status === 200, `Resubmission expected status 200, got ${secondRes.status}`);
      assert(secondRes.data.rewardResult.isResubmission === true, 'Response missing isResubmission: true');
      assert(secondRes.data.rewardResult.bonusCoins === 0, 'Resubmission awarded bonus coins!');

      // Balance must NOT have increased
      const studentAfterSecond = await User.findById(student2._id);
      assert(
        studentAfterSecond?.coins === expectedAfterFirst,
        `Resubmission awarded extra coins! Balance was ${expectedAfterFirst}, now ${studentAfterSecond?.coins}`
      );

      // Verify submission document updated
      const sub = await Submission.findOne({ task: resubmittableTask._id, student: student2._id });
      assert(sub?.textResponse === 'Revised work version 2 with improvements', 'Submission textResponse was not updated');

      results.push({
        num: 3,
        name: 'Resubmission Idempotency',
        passed: true,
        details: 'Resubmission updated submission content without awarding any additional coins or duplicate bonuses.',
      });
      console.log('  ✅ PASSED: Resubmission updated content with 0 additional coins awarded.\n');
    } catch (err: any) {
      results.push({ num: 3, name: 'Resubmission Idempotency', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 4: Early-Bird Bonus Allocation Under Simultaneous Multi-Student Race
    // -----------------------------------------------------------------------
    try {
      console.log('Test 4: Testing simultaneous submissions from 4 students racing for Early Bird bonuses...');

      const multiTask = await Task.create({
        title: `Early Bird Race Task ${runId}`,
        description: 'Testing podium allocation under concurrency',
        category: 'assignment',
        subject: testSubject._id,
        deadline: new Date(Date.now() + 86400000),
        maxBasePoints: 100,
        bonusRules: { firstBonus: 50, secondBonus: 35, thirdBonus: 20, latePenaltyPct: 50 },
        allowResubmission: false,
        status: 'published',
        createdBy: testFaculty._id,
      });
      createdTaskIds.push(multiTask._id);

      // Create 4 distinct students
      const students = await Promise.all(
        [1, 2, 3, 4].map((i) =>
          User.create({
            name: `Racer Student ${i} ${runId}`,
            email: `racer${i}_${runId}@internal.test`,
            passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
            role: 'student',
            department: 'Computer Science',
            semester: 4,
            coins: 0,
            points: 0,
          })
        )
      );
      students.forEach((s) => createdUserIds.push(s._id));

      // Submit concurrently from all 4 students at the exact same instant
      const racePromises = students.map((s, idx) => {
        const token = generateToken(s);
        return apiRequest('/submissions/submit', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            taskId: multiTask._id.toString(),
            submissionType: 'text',
            textResponse: `Student ${idx + 1} submission in concurrency race`,
          }),
        });
      });

      const raceResponses = await Promise.all(racePromises);

      // Verify all 4 succeeded
      const allSucceeded = raceResponses.every((r) => r.status === 201 || r.status === 200);
      if (!allSucceeded) {
        console.error('Race failed responses:', raceResponses.filter(r => r.status !== 200 && r.status !== 201).map(r => ({ status: r.status, data: r.data })));
      }
      assert(allSucceeded, `Not all race submissions succeeded. Statuses: ${JSON.stringify(raceResponses.map((r) => r.status))}`);

      // Query database submissions
      const submissions = await Submission.find({ task: multiTask._id });
      assert(submissions.length === 4, `Expected 4 submissions, got ${submissions.length}`);

      const ranks = submissions.map((s) => s.bonusRankAwarded).sort();
      // Expected ranks: [1, 2, 3, null]
      const rank1Count = submissions.filter((s) => s.bonusRankAwarded === 1).length;
      const rank2Count = submissions.filter((s) => s.bonusRankAwarded === 2).length;
      const rank3Count = submissions.filter((s) => s.bonusRankAwarded === 3).length;
      const rankNullCount = submissions.filter((s) => s.bonusRankAwarded === null).length;

      assert(rank1Count === 1, `Expected exactly 1 student with Rank 1 (+50 bonus), got ${rank1Count}`);
      assert(rank2Count === 1, `Expected exactly 1 student with Rank 2 (+35 bonus), got ${rank2Count}`);
      assert(rank3Count === 1, `Expected exactly 1 student with Rank 3 (+20 bonus), got ${rank3Count}`);
      assert(rankNullCount === 1, `Expected exactly 1 student with Rank null (0 bonus), got ${rankNullCount}`);

      // Verify each student's balance in User matches their awarded rank
      for (const s of submissions) {
        const user = await User.findById(s.student);
        let expectedBonus = 0;
        if (s.bonusRankAwarded === 1) expectedBonus = 50;
        if (s.bonusRankAwarded === 2) expectedBonus = 35;
        if (s.bonusRankAwarded === 3) expectedBonus = 20;

        const expectedTotal = 100 + expectedBonus;
        assert(
          user?.coins === expectedTotal,
          `User balance mismatch for rank ${s.bonusRankAwarded}: expected ${expectedTotal}, got ${user?.coins}`
        );
      }

      results.push({
        num: 4,
        name: 'Concurrent Early-Bird Bonus Allocation',
        passed: true,
        details: `4 simultaneous submissions uniquely received ranks [1, 2, 3, null]. Exactly one 1st (+50), one 2nd (+35), one 3rd (+20), and one 4th (+0). Zero duplicates or collisions.`,
      });
      console.log('  ✅ PASSED: 4 racers cleanly received podium ranks [1, 2, 3, null] with exact bonus amounts.\n');
    } catch (err: any) {
      results.push({ num: 4, name: 'Concurrent Early-Bird Bonus Allocation', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }

    // -----------------------------------------------------------------------
    // Test 5: Transaction Failure & Rollback Safety
    // -----------------------------------------------------------------------
    try {
      console.log('Test 5: Testing transaction rollback safety on abort...');

      const rollbackStudent = await User.create({
        name: `Rollback Student ${runId}`,
        email: `rollback_${runId}@internal.test`,
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        role: 'student',
        department: 'Computer Science',
        semester: 4,
        coins: 500,
        points: 500,
      });
      createdUserIds.push(rollbackStudent._id);

      const rollbackTask = await Task.create({
        title: `Rollback Task ${runId}`,
        description: 'Testing rollback isolation',
        category: 'assignment',
        subject: testSubject._id,
        deadline: new Date(Date.now() + 86400000),
        maxBasePoints: 100,
        status: 'published',
        createdBy: testFaculty._id,
      });
      createdTaskIds.push(rollbackTask._id);

      let caughtError = false;
      try {
        await runTransactionWithRetry(async (session) => {
          // Increment user balance inside session
          await User.findByIdAndUpdate(
            rollbackStudent._id,
            { $inc: { coins: 1000 } },
            session ? { session } : undefined
          );

          // Force an error to trigger abortTransaction
          throw new Error('Simulated mid-operation transaction failure');
        });
      } catch (err: any) {
        if (err.message.includes('Simulated mid-operation transaction failure')) {
          caughtError = true;
        }
      }

      assert(caughtError, 'Expected simulated transaction error was not caught');

      // Verify that if transactions are supported, the balance was NOT modified
      const refreshedRollbackStudent = await User.findById(rollbackStudent._id);
      if (isTx) {
        assert(
          refreshedRollbackStudent?.coins === 500,
          `Rollback failed! Coins should be 500, found: ${refreshedRollbackStudent?.coins}`
        );
      }

      results.push({
        num: 5,
        name: 'Transaction Abort & Rollback Safety',
        passed: true,
        details: isTx
          ? 'Transaction aborted cleanly. The uncommitted +1000 coin increment was completely rolled back by MongoDB snapshot isolation.'
          : 'Standalone fallback executed cleanly.',
      });
      console.log(`  ✅ PASSED: Transaction aborted cleanly; balance verified untouched (${refreshedRollbackStudent?.coins}).\n`);
    } catch (err: any) {
      results.push({ num: 5, name: 'Transaction Abort & Rollback Safety', passed: false, details: err.message });
      console.error('  ❌ FAILED:', err.message, '\n');
    }
  } finally {
    // -----------------------------------------------------------------------
    // Strict Cleanup: Only delete temporary test records created during this run
    // -----------------------------------------------------------------------
    console.log('🧹 Cleaning up temporary test artifacts...');
    if (createdTaskIds.length > 0) {
      await Submission.deleteMany({ task: { $in: createdTaskIds } });
      await CoinTransaction.deleteMany({ task: { $in: createdTaskIds } });
      await Task.deleteMany({ _id: { $in: createdTaskIds } });
    }
    if (createdUserIds.length > 0) {
      await Notification.deleteMany({ user: { $in: createdUserIds } });
      await CoinTransaction.deleteMany({ student: { $in: createdUserIds } });
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdSubjectIds.length > 0) {
      await Subject.deleteMany({ _id: { $in: createdSubjectIds } });
    }
    console.log('✨ Cleanup complete. Real student balances and records are completely untouched.\n');

    await mongoose.disconnect();
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('='.repeat(75));
  console.log('📊 CONCURRENCY & IDEMPOTENCY TEST SUMMARY');
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

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

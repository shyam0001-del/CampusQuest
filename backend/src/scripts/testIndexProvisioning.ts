import mongoose, { Types } from 'mongoose';
import { ENV } from '../config/env';
import { ensureDatabaseIndexes, inspectActiveIndexes, REQUIRED_INDEXES } from '../config/indexManager';
import { Submission } from '../models/Submission';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { Task } from '../models/Task';
import { Subject } from '../models/Subject';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('='.repeat(75));
  console.log('🛡️ CampusQuest Index Provisioning & Idempotency Test Suite');
  console.log('='.repeat(75) + '\n');

  if (!ENV.MONGODB_URI) {
    throw new Error('MONGODB_URI missing from environment.');
  }

  await mongoose.connect(ENV.MONGODB_URI, { dbName: 'campusquest' });

  const runId = `idx_${Date.now()}`;
  const createdUserIds: Types.ObjectId[] = [];
  const createdSubjectIds: Types.ObjectId[] = [];
  const createdTaskIds: Types.ObjectId[] = [];
  const createdSubmissionIds: Types.ObjectId[] = [];
  const createdTxIds: Types.ObjectId[] = [];

  try {
    // -------------------------------------------------------------------------
    // Test 1: Verify All Required Unique & Partial Indexes are Active
    // -------------------------------------------------------------------------
    console.log('Test 1: Inspecting active MongoDB Atlas indexes against requirements...');
    const report1 = await ensureDatabaseIndexes();

    if (report1.success && report1.missing.length === 0) {
      results.push({
        name: 'Active Index Verification',
        passed: true,
        details: `All ${REQUIRED_INDEXES.length} required indexes verified. Active: ${report1.alreadyPresent.concat(report1.newlyCreated).join(', ')}`,
      });
      console.log('  ✅ PASSED: All required unique and partial indexes verified.');
    } else {
      results.push({
        name: 'Active Index Verification',
        passed: false,
        details: `Missing indexes: ${report1.missing.join(', ')}`,
      });
      console.log('  ❌ FAILED: Missing indexes:', report1.missing);
    }

    // -------------------------------------------------------------------------
    // Test 2: Idempotency Verification (Subsequent calls must NOT drop or duplicate)
    // -------------------------------------------------------------------------
    console.log('Test 2: Verifying idempotency of ensureDatabaseIndexes()...');
    const indexesBefore = await inspectActiveIndexes();
    const report2 = await ensureDatabaseIndexes();
    const indexesAfter = await inspectActiveIndexes();

    const countBefore = (indexesBefore.Submission?.length || 0) + (indexesBefore.CoinTransaction?.length || 0) + (indexesBefore.User?.length || 0);
    const countAfter = (indexesAfter.Submission?.length || 0) + (indexesAfter.CoinTransaction?.length || 0) + (indexesAfter.User?.length || 0);

    const isIdempotent = report2.success && report2.newlyCreated.length === 0 && countBefore === countAfter;
    if (isIdempotent) {
      results.push({
        name: 'Idempotent Provisioning',
        passed: true,
        details: `Second execution made 0 changes; index counts identical (${countBefore} before, ${countAfter} after). Zero indexes dropped.`,
      });
      console.log('  ✅ PASSED: Index provisioning is fully idempotent and non-destructive.');
    } else {
      results.push({
        name: 'Idempotent Provisioning',
        passed: false,
        details: `Expected zero newly created, got: ${report2.newlyCreated.join(', ')}`,
      });
      console.log('  ❌ FAILED: Unexpected changes during idempotent execution.');
    }

    // -------------------------------------------------------------------------
    // Setup Temporary Fixtures for Constraint Tests
    // -------------------------------------------------------------------------
    const testUser = await User.create({
      name: `Idx Test Student ${runId}`,
      email: `idx_student_${runId}@campusquest.test`,
      passwordHash: 'hashed_password_placeholder',
      role: 'student',
    });
    createdUserIds.push(testUser._id);

    const testSubject = await Subject.create({
      name: `Idx Test Subject ${runId}`,
      code: `ID${runId.slice(-4)}`,
      createdBy: testUser._id,
    });
    createdSubjectIds.push(testSubject._id);

    const testTask = await Task.create({
      title: `Idx Test Task ${runId}`,
      description: 'Temporary task for index enforcement verification',
      subject: testSubject._id,
      createdBy: testUser._id,
      deadline: new Date(Date.now() + 86400000),
      totalPoints: 100,
      coinReward: 50,
      status: 'published',
    });
    createdTaskIds.push(testTask._id);

    // -------------------------------------------------------------------------
    // Test 3: Compound Unique Index Enforcement on Submissions (task + student)
    // -------------------------------------------------------------------------
    console.log('Test 3: Testing compound unique index { task: 1, student: 1 } enforcement...');
    const sub1 = await Submission.create({
      task: testTask._id,
      student: testUser._id,
      subject: testSubject._id,
      submissionType: 'text',
      textResponse: 'First unique submission',
      status: 'submitted',
      submittedAt: new Date(),
    });
    createdSubmissionIds.push(sub1._id);

    let duplicateRejected = false;
    try {
      await Submission.create({
        task: testTask._id,
        student: testUser._id,
        subject: testSubject._id,
        submissionType: 'text',
        textResponse: 'Illegal duplicate submission',
        status: 'submitted',
        submittedAt: new Date(),
      });
    } catch (err: any) {
      if (err.code === 11000) {
        duplicateRejected = true;
      }
    }

    if (duplicateRejected) {
      results.push({
        name: 'Compound Unique Submission Index',
        passed: true,
        details: 'MongoDB correctly rejected duplicate { task, student } with E11000 duplicate key error.',
      });
      console.log('  ✅ PASSED: Duplicate submission rejected by unique compound index.');
    } else {
      results.push({
        name: 'Compound Unique Submission Index',
        passed: false,
        details: 'Duplicate submission was NOT rejected by database index.',
      });
      console.log('  ❌ FAILED: Duplicate submission succeeded.');
    }

    // -------------------------------------------------------------------------
    // Test 4: Partial Unique Index Enforcement on Early-Bird Bonus Ranks
    // -------------------------------------------------------------------------
    console.log('Test 4: Testing partial unique index { task: 1, bonusRankAwarded: 1 }...');
    const testUser2 = await User.create({
      name: `Idx Test Student 2 ${runId}`,
      email: `idx_student2_${runId}@campusquest.test`,
      passwordHash: 'hashed_password_placeholder',
      role: 'student',
    });
    createdUserIds.push(testUser2._id);

    // Give sub1 rank 1
    sub1.bonusRankAwarded = 1;
    await sub1.save();

    let duplicateRankRejected = false;
    try {
      const sub2 = await Submission.create({
        task: testTask._id,
        student: testUser2._id,
        subject: testSubject._id,
        submissionType: 'text',
        textResponse: 'Second student attempting duplicate rank 1',
        bonusRankAwarded: 1, // Conflict with sub1!
        status: 'submitted',
        submittedAt: new Date(),
      });
      createdSubmissionIds.push(sub2._id);
    } catch (err: any) {
      if (err.code === 11000) {
        duplicateRankRejected = true;
      }
    }

    // Now verify that multiple nulls are ALLOWED by the partialFilterExpression
    let multipleNullsAllowed = false;
    try {
      const subNull = await Submission.create({
        task: testTask._id,
        student: testUser2._id,
        subject: testSubject._id,
        submissionType: 'text',
        textResponse: 'Student with null bonus rank',
        bonusRankAwarded: null, // Should succeed even if others have null
        status: 'submitted',
        submittedAt: new Date(),
      });
      createdSubmissionIds.push(subNull._id);
      multipleNullsAllowed = true;
    } catch {
      multipleNullsAllowed = false;
    }

    if (duplicateRankRejected && multipleNullsAllowed) {
      results.push({
        name: 'Partial Unique Bonus Rank Index',
        passed: true,
        details: 'Duplicate rank 1 rejected with E11000; multiple null bonusRankAwarded permitted by partial filter.',
      });
      console.log('  ✅ PASSED: Partial unique index correctly protects podium ranks.');
    } else {
      results.push({
        name: 'Partial Unique Bonus Rank Index',
        passed: false,
        details: `duplicateRankRejected=${duplicateRankRejected}, multipleNullsAllowed=${multipleNullsAllowed}`,
      });
      console.log('  ❌ FAILED: Partial unique index behavior mismatch.');
    }

    // -------------------------------------------------------------------------
    // Test 5: Unique Partial Index on CoinTransaction (student + task + type)
    // -------------------------------------------------------------------------
    console.log('Test 5: Testing partial unique index on CoinTransaction...');
    const tx1 = await CoinTransaction.create({
      student: testUser._id,
      task: testTask._id,
      amount: 50,
      type: 'base_reward',
      reason: 'Base reward test',
      balanceAfter: 50,
    });
    createdTxIds.push(tx1._id);

    let duplicateTxRejected = false;
    try {
      await CoinTransaction.create({
        student: testUser._id,
        task: testTask._id,
        amount: 50,
        type: 'base_reward', // Duplicate reward for same student and task!
        reason: 'Duplicate base reward test',
        balanceAfter: 100,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        duplicateTxRejected = true;
      }
    }

    if (duplicateTxRejected) {
      results.push({
        name: 'CoinTransaction Unique Reward Index',
        passed: true,
        details: 'Duplicate coin reward transaction for same student and task strictly blocked by E11000.',
      });
      console.log('  ✅ PASSED: Duplicate coin transaction rejected by partial unique index.');
    } else {
      results.push({
        name: 'CoinTransaction Unique Reward Index',
        passed: false,
        details: 'Duplicate coin transaction was NOT rejected by index.',
      });
      console.log('  ❌ FAILED: Duplicate coin transaction succeeded.');
    }
  } finally {
    console.log('\n🧹 Cleaning up temporary index test fixtures...');
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
    console.log('✨ Cleanup complete. Zero real records modified.\n');
  }

  console.log('='.repeat(75));
  console.log('📊 INDEX PROVISIONING & ENFORCEMENT SUMMARY');
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
    console.error(`Result: Some tests failed.\n`);
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

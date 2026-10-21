import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

/**
 * CLI Recovery procedure for a locked-out administrator.
 * Usage: npm run recover:admin -- --email admin@campusquest.edu --password NewSecretPassword123!
 */
export const recoverAdmin = async (): Promise<void> => {
  try {
    await connectDB();

    const args = process.argv.slice(2);
    let email = process.env.RECOVER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '';
    let newPassword = process.env.RECOVER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) email = args[i + 1].toLowerCase().trim();
      if (args[i] === '--password' && args[i + 1]) newPassword = args[i + 1];
    }

    if (!email || !newPassword) {
      console.log('❌ Error: Both --email and --password arguments are required for administrator recovery.');
      console.log('Usage example: npm run recover:admin -- --email admin@campusquest.edu --password NewPassword123!');
      process.exit(1);
    }

    if (newPassword.length < 8) {
      console.log('❌ Error: Password must be at least 8 characters long.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    let user = await User.findOne({ email });
    if (!user) {
      console.log(`ℹ️ User ${email} not found. Creating new verified administrator account...`);
      user = await User.create({
        name: 'Recovered Administrator',
        email,
        passwordHash,
        role: 'admin',
        approvalStatus: 'approved',
        department: 'Academic Administration',
        facultyDesignation: 'System Administrator',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=admin`,
        rollNumber: 'RECOVERED-ADMIN',
        coins: 0,
        points: 0,
        xp: 0,
        level: 10,
        isDemoUser: false,
      });
    } else {
      user.passwordHash = passwordHash;
      user.role = 'admin'; // Promote or ensure admin role
      user.approvalStatus = 'approved';
      await user.save();
    }

    await AuditLog.create({
      action: 'ADMIN_ACCOUNT_RECOVERY',
      performedBy: user._id,
      targetType: 'User',
      targetId: user._id.toString(),
      details: { email: user.email, message: 'Administrator credentials recovered via secure server CLI' },
    });

    console.log(`✅ [Recovery Success] Administrator account '${email}' has been updated and granted full access.`);
  } catch (error) {
    console.error('❌ [Recovery Error]', error);
    process.exit(1);
  }
};

if (require.main === module) {
  recoverAdmin().then(() => {
    process.exit(0);
  });
}

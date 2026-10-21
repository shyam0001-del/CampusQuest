import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

/**
 * Bootstrap the initial administrator.
 * Security guarantee: If an administrator already exists in the database,
 * this script refuses to create another admin to prevent privilege escalation.
 * Passwords are never printed or logged to console outputs.
 */
export const bootstrapAdmin = async (): Promise<void> => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`🔒 [Bootstrap] Administrator already provisioned: ${existingAdmin.email}.`);
      console.log(`ℹ️ [Bootstrap] Bootstrap is locked. Use 'npm run recover:admin' if you need account recovery.`);
      return;
    }

    // Parse CLI arguments or environment variables
    const args = process.argv.slice(2);
    let email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
    let password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    let name = process.env.BOOTSTRAP_ADMIN_NAME || process.env.ADMIN_NAME || 'System Administrator';

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) email = args[i + 1];
      if (args[i] === '--password' && args[i + 1]) password = args[i + 1];
      if (args[i] === '--name' && args[i + 1]) name = args[i + 1];
    }

    if (!email) {
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Error: In production, please specify the administrator email via ADMIN_EMAIL / BOOTSTRAP_ADMIN_EMAIL or --email argument.');
        process.exit(1);
      }
      email = 'admin@campusquest.edu';
    }

    if (!password) {
      console.error('❌ Error: Administrator password is required.');
      console.error('   Please provide it securely via ADMIN_PASSWORD environment variable or --password flag.');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('❌ Error: Administrator password must be at least 8 characters long.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'admin',
      approvalStatus: 'approved',
      facultyDesignation: 'System Administrator',
      department: 'Academic Administration',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      rollNumber: 'ROOT-ADMIN-01',
      coins: 0,
      points: 0,
      xp: 0,
      level: 10,
      isDemoUser: false,
    });

    await AuditLog.create({
      action: 'BOOTSTRAP_ADMIN_PROVISIONED',
      performedBy: admin._id,
      targetType: 'User',
      targetId: admin._id.toString(),
      details: { email: admin.email, name: admin.name },
    });

    console.log(`✅ [Bootstrap] Administrator account provisioned successfully!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: [PROTECTED / NOT LOGGED]`);
  } catch (error) {
    console.error('❌ [Bootstrap Error]', error);
    process.exit(1);
  }
};

if (require.main === module) {
  bootstrapAdmin().then(() => {
    process.exit(0);
  });
}

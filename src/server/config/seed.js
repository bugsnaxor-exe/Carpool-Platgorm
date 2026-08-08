const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const Wallet = require('../../../models/Wallet');
const { hashPassword } = require('../utils/security');

const seedDefaultCredentials = async () => {
  try {
    let org = await Organization.findOne({ code: 'ACME' });
    if (!org) {
      org = await Organization.create({
        name: 'Acme Corporation',
        code: 'ACME',
        domain: 'acme.com',
        address: 'Sector V, Salt Lake City, Kolkata'
      });
    }

    const defaultAccounts = [
      {
        name: 'Alex Rivera (Driver)',
        email: 'alex.rivera@acme.com',
        mobileNumber: '+919811223344',
        password: 'Password123!',
        role: 'EMPLOYEE',
        department: 'Engineering',
        designation: 'Senior Software Engineer'
      },
      {
        name: 'Priya Sharma (Rider)',
        email: 'priya.sharma@acme.com',
        mobileNumber: '+919988776655',
        password: 'Password123!',
        role: 'EMPLOYEE',
        department: 'Marketing',
        designation: 'Product Marketing Lead'
      },
      {
        name: 'Sayantan Dasgupta (Admin)',
        email: 'admin@acme.com',
        mobileNumber: '+919832846460',
        password: 'Password123!',
        role: 'COMPANY_ADMIN',
        department: 'Executive Management',
        designation: 'Global Fleet Administrator'
      },
      {
        name: 'Rohan Verma (Employee)',
        email: 'rohan.verma@acme.com',
        mobileNumber: '+919776655443',
        password: 'Password123!',
        role: 'EMPLOYEE',
        department: 'Sales',
        designation: 'Account Executive'
      }
    ];

    for (const acc of defaultAccounts) {
      const existing = await User.findOne({ email: acc.email });
      if (!existing) {
        const newUser = await User.create({
          name: acc.name,
          email: acc.email,
          mobileNumber: acc.mobileNumber,
          password: hashPassword(acc.password),
          role: acc.role,
          organizationId: org._id,
          department: acc.department,
          designation: acc.designation,
          emailVerified: true,
          phoneVerified: true,
          loginCount: 1,
          lastLoginAt: new Date(),
          status: 'ACTIVE'
        });

        await Wallet.create({ userId: newUser._id, balance: 1250 });
        console.log(`[DB Seeder] Automatically seeded default login account: ${acc.email}`);
      }
    }
  } catch (err) {
    console.error(`[DB Seeder Error] Could not seed default credentials: ${err.message}`);
  }
};

module.exports = { seedDefaultCredentials };

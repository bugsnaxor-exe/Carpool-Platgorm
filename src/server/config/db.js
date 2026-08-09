const mongoose = require('mongoose');
const Organization = require('../../../models/Organization');
const User = require('../../../models/User');
const Vehicle = require('../../../models/Vehicle');
const Ride = require('../../../models/Ride');
const Wallet = require('../../../models/Wallet');
const AuditLog = require('../../../models/AuditLog');
const { hashPassword } = require('../utils/security');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return true;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carpool';
  console.log(`[DB Connector] Connecting to MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10-second resilient timeout
      connectTimeoutMS: 10000,
      maxPoolSize: 20
    });
    isConnected = true;
    console.log(`[DB Connector] Successfully connected to MongoDB Database!`);
    await seedDatabaseIfNeeded();
    return true;
  } catch (error) {
    isConnected = false;
    console.error(`[DB Connector] MongoDB Connection Error: ${error.message}`);
    console.warn(`[DB Connector] IMPORTANT: Ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0).`);
    return false;
  }
};

const isDBConnected = () => isConnected && mongoose.connection.readyState === 1;

const seedDatabaseIfNeeded = async () => {
  try {
    let org = await Organization.findOne({ code: 'ACME' });
    if (!org) {
      org = await Organization.create({
        name: 'Acme Corporation',
        code: 'ACME',
        fuelCostPerLiter: 102.50,
        travelCostPerKm: 8.50
      });
    }

    const pwd = hashPassword('Password123!');
    const demoAccounts = [
      { name: 'Alex Rivera', email: 'alex.rivera@acme.com', mobileNumber: '+919876543210', phone: '+919876543210', role: 'EMPLOYEE', organizationId: org._id },
      { name: 'Priya Sharma', email: 'priya.sharma@acme.com', mobileNumber: '+919876543211', phone: '+919876543211', role: 'EMPLOYEE', organizationId: org._id },
      { name: 'Acme Admin', email: 'admin@acme.com', mobileNumber: '+919876543212', phone: '+919876543212', role: 'COMPANY_ADMIN', organizationId: org._id }
    ];

    for (const u of demoAccounts) {
      const existing = await User.findOne({ email: u.email });
      if (!existing) {
        await User.create({
          ...u,
          password: pwd,
          wallet: 500,
          walletBalance: 500,
          status: 'ACTIVE',
          emailVerified: true
        });
        console.log(`[DB Seeder] Demo Account Ensured: ${u.email}`);
      }
    }
  } catch (err) {
    console.error('[DB Seeder] Error seeding demo accounts:', err.message);
  }
};

module.exports = { connectDB, isDBConnected };

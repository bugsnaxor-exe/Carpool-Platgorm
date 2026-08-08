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
    const orgCount = await Organization.countDocuments();
    if (orgCount > 0) return;

    console.log('[DB Seeder] Empty database detected. Seeding initial enterprise organization and demo data...');
    const pwd = hashPassword('Password123!');

    const org1 = await Organization.create({
      name: 'Acme Corporation',
      code: 'ACME',
      fuelCostPerLiter: 102.50,
      travelCostPerKm: 8.50
    });

    const admin = await User.create({
      name: 'Sarah Connor',
      email: 'admin@acme.com',
      mobileNumber: '+919876543210',
      password: pwd,
      role: 'COMPANY_ADMIN',
      organizationId: org1._id,
      department: 'Corporate Mobility',
      savedPlaces: [{ label: 'HQ Office', address: 'Tech Park, Whitefield', lat: 12.9716, lng: 77.5946 }]
    });

    const driver1 = await User.create({
      name: 'Alex Rivera',
      email: 'alex.rivera@acme.com',
      mobileNumber: '+919811223344',
      password: pwd,
      role: 'EMPLOYEE',
      organizationId: org1._id,
      department: 'Engineering',
      savedPlaces: [
        { label: 'Home', address: 'Bellandur', lat: 12.9279, lng: 77.6772 },
        { label: 'Office', address: 'E-City Campus', lat: 12.8452, lng: 77.6602 }
      ]
    });

    const passenger1 = await User.create({
      name: 'Priya Sharma',
      email: 'priya.s@acme.com',
      mobileNumber: '+919988776655',
      password: pwd,
      role: 'EMPLOYEE',
      organizationId: org1._id,
      department: 'Product Design',
      savedPlaces: [{ label: 'Home', address: 'HSR Layout', lat: 12.9121, lng: 77.6445 }]
    });

    const veh1 = await Vehicle.create({
      userId: driver1._id,
      organizationId: org1._id,
      model: 'Tata Nexon EV',
      registrationNumber: 'KA-01-EQ-9988',
      seatingCapacity: 4,
      fuelType: 'EV',
      color: 'Teal Blue',
      status: 'APPROVED'
    });

    await Ride.create({
      driverId: driver1._id,
      driverName: driver1.name,
      driverPhone: driver1.mobileNumber,
      vehicleId: veh1._id,
      vehicleModel: `${veh1.model} (${veh1.registrationNumber})`,
      organizationId: org1._id,
      pickupLocation: { name: 'Green Glen Layout, Bellandur', lat: 12.9279, lng: 77.6772 },
      destinationLocation: { name: 'Acme Campus, Electronic City', lat: 12.8452, lng: 77.6602 },
      travelDateTime: new Date(Date.now() + 3600000),
      totalSeats: 3,
      availableSeats: 2,
      farePerSeat: 120,
      recurring: true,
      routeDistanceKm: 14.5,
      estimatedDurationMins: 30,
      status: 'OPEN'
    });

    await Wallet.create({ userId: admin._id, balance: 1500 });
    await Wallet.create({ userId: driver1._id, balance: 850 });
    await Wallet.create({ userId: passenger1._id, balance: 600 });

    await AuditLog.create({
      performedBy: admin._id,
      action: 'MONGODB_ATLAS_SEED',
      targetType: 'Platform',
      details: 'Initialized Mongoose schemas & Atlas connection',
      organizationId: org1._id
    });

    console.log('[DB Seeder] Clean initial enterprise database seeded successfully.');
  } catch (err) {
    console.error('[DB Seeder] Error seeding initial database:', err);
  }
};

module.exports = { connectDB, isDBConnected };

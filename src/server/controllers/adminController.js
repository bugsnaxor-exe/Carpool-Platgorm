const User = require('../../../models/User');
const Ride = require('../../../models/Ride');
const Trip = require('../../../models/Trip');
const Vehicle = require('../../../models/Vehicle');
const AuditLog = require('../../../models/AuditLog');
const { catchAsync } = require('../utils/errorHandler');

const getEmployees = catchAsync(async (user) => {
  try {
    if (!user || user.role !== 'COMPANY_ADMIN' && user.role !== 'Admin') {
      return { status: 403, data: { error: 'Forbidden: Admin access required' } };
    }

    const employees = await User.find().select('-password -otp -otpExpires').sort({ createdAt: -1 });
    return { status: 200, data: employees };
  } catch (err) {
    console.error(`[Admin Get Employees Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to fetch employee roster', details: err.message } };
  }
});

const getAnalytics = catchAsync(async (user) => {
  try {
    if (!user || user.role !== 'COMPANY_ADMIN' && user.role !== 'Admin') {
      return { status: 403, data: { error: 'Forbidden: Admin access required' } };
    }

    const employeeCount = await User.countDocuments();
    const rideCount = await Ride.countDocuments();
    const tripCount = await Trip.countDocuments();
    const vehicleCount = await Vehicle.countDocuments();

    return {
      status: 200,
      data: {
        totalEmployees: employeeCount,
        publishedRides: rideCount,
        completedTrips: tripCount,
        activeVehicles: vehicleCount,
        co2SavedKg: (tripCount * 4.2).toFixed(1),
        fuelSavedLiters: (tripCount * 1.8).toFixed(1),
        costEfficiencyScore: '94%'
      }
    };
  } catch (err) {
    console.error(`[Admin Get Analytics Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to fetch analytics', details: err.message } };
  }
});

const getAuditLogs = catchAsync(async (user) => {
  try {
    if (!user || user.role !== 'COMPANY_ADMIN' && user.role !== 'Admin') {
      return { status: 403, data: { error: 'Forbidden: Admin access required' } };
    }

    const logs = await AuditLog.find().populate('performedBy', 'name email').sort({ createdAt: -1 }).limit(50);
    return { status: 200, data: logs };
  } catch (err) {
    console.error(`[Admin Get Audit Logs Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to fetch audit logs', details: err.message } };
  }
});

module.exports = { getEmployees, getAnalytics, getAuditLogs };

const User = require('../../../models/User');
const Vehicle = require('../../../models/Vehicle');
const Trip = require('../../../models/Trip');
const AuditLog = require('../../../models/AuditLog');

const getEmployees = async (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') {
    return { status: 403, data: { error: 'Forbidden: Admin access required' } };
  }

  const employees = await User.find({ role: 'EMPLOYEE' }).select('-password');
  return { status: 200, data: employees };
};

const getAnalytics = async (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') {
    return { status: 403, data: { error: 'Forbidden: Admin access required' } };
  }

  const totalEmployees = await User.countDocuments({ role: 'EMPLOYEE' });
  const activeVehicles = await Vehicle.countDocuments({ status: 'APPROVED' });
  const totalTrips = await Trip.countDocuments();
  const completedTrips = await Trip.countDocuments({ status: 'COMPLETED' });

  return {
    status: 200,
    data: {
      totalEmployees,
      activeVehicles,
      totalTrips,
      completedTrips,
      co2SavedKg: Math.round(completedTrips * 4.2),
      fuelSavedLiters: Math.round(completedTrips * 1.8),
      totalFareVolume: completedTrips * 140
    }
  };
};

const getAuditLogs = async (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') {
    return { status: 403, data: { error: 'Forbidden: Admin access required' } };
  }

  const logs = await AuditLog.find()
    .populate('performedBy', 'name email role')
    .sort({ timestamp: -1 })
    .limit(50);

  return { status: 200, data: logs };
};

module.exports = { getEmployees, getAnalytics, getAuditLogs };

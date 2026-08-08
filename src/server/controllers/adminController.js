const db = require('../config/db');

const getEmployees = (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') return { status: 403, data: { error: 'Admin access required' } };
  const cleanEmployees = db.users.map(({ password, ...u }) => u);
  return { status: 200, data: cleanEmployees };
};

const getAnalytics = (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') return { status: 403, data: { error: 'Admin access required' } };
  const totalTrips = db.trips.length + 24;
  const totalDistanceKm = (db.trips.length * 15.2) + 3420.5;
  const totalCo2SavedKg = (totalDistanceKm * 0.12 * 1.8).toFixed(1);

  return {
    status: 200,
    data: {
      totalTrips,
      totalDistanceKm: totalDistanceKm.toFixed(1),
      estimatedFuelLiters: (totalDistanceKm / 14.2).toFixed(1),
      co2SavedKg: totalCo2SavedKg,
      travelCostPerKm: 8.5,
      totalOperationalCost: (totalDistanceKm * 8.5).toFixed(2),
      activeRidesCount: db.rides.filter(r => r.status === 'OPEN').length
    }
  };
};

const getAuditLogs = (user) => {
  if (!user || user.role !== 'COMPANY_ADMIN') return { status: 403, data: { error: 'Admin access required' } };
  return { status: 200, data: db.auditLogs };
};

module.exports = {
  getEmployees,
  getAnalytics,
  getAuditLogs
};

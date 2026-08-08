const db = require('../config/db');

const publishRide = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { vehicleId, pickupLocation, destinationLocation, waypoints, availableSeats, farePerSeat } = reqData;

  const vehicle = db.vehicles.find(v => v._id === vehicleId && v.userId === user.userId);
  if (!vehicle) return { status: 400, data: { error: 'Invalid registered vehicle' } };

  const distanceKm = 14.5;
  const co2SavedKg = (distanceKm * 0.12 * (parseInt(availableSeats, 10) || 1)).toFixed(2);

  const newRide = {
    _id: 'ride_' + Date.now(),
    driverId: user.userId,
    driverName: user.name,
    driverPhone: user.mobileNumber || '+919811223344',
    vehicleId: vehicle._id,
    vehicleModel: `${vehicle.model} (${vehicle.registrationNumber})`,
    organizationId: user.organizationId,
    pickupLocation,
    destinationLocation,
    waypoints: waypoints || ['Silk Board Junction'],
    travelDateTime: new Date(Date.now() + 3600000).toISOString(),
    totalSeats: parseInt(availableSeats, 10),
    availableSeats: parseInt(availableSeats, 10),
    farePerSeat: parseFloat(farePerSeat),
    routeDistanceKm: distanceKm,
    co2SavedKg: parseFloat(co2SavedKg),
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };
  db.rides.push(newRide);

  db.auditLogs.push({
    _id: 'log_' + Date.now(),
    performedBy: user.userId,
    action: 'PUBLISH_RIDE',
    targetType: 'Ride',
    details: `Published ride from ${pickupLocation.name || pickupLocation} to ${destinationLocation.name || destinationLocation} (${co2SavedKg}kg CO₂ offset)`,
    timestamp: new Date().toISOString()
  });

  return { status: 201, data: newRide };
};

const searchRides = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { seats } = reqData;
  const needed = parseInt(seats, 10) || 1;
  const matches = db.rides.filter(r =>
    r.organizationId === user.organizationId &&
    r.status === 'OPEN' &&
    r.availableSeats >= needed &&
    r.driverId !== user.userId
  );
  return { status: 200, data: matches };
};

module.exports = {
  publishRide,
  searchRides
};

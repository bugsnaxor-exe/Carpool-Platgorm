const db = require('../config/db');

const publishRide = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { vehicleId, pickupLocation, destinationLocation, availableSeats, farePerSeat } = reqData;

  const vehicle = db.vehicles.find(v => v._id === vehicleId && v.userId === user.userId);
  if (!vehicle) return { status: 400, data: { error: 'Invalid registered vehicle' } };

  const newRide = {
    _id: 'ride_' + Date.now(),
    driverId: user.userId,
    driverName: user.name,
    vehicleId: vehicle._id,
    vehicleModel: `${vehicle.model} (${vehicle.registrationNumber})`,
    organizationId: user.organizationId,
    pickupLocation,
    destinationLocation,
    travelDateTime: new Date(Date.now() + 3600000).toISOString(),
    totalSeats: parseInt(availableSeats, 10),
    availableSeats: parseInt(availableSeats, 10),
    farePerSeat: parseFloat(farePerSeat),
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };
  db.rides.push(newRide);
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

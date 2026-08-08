const db = require('../config/db');

const bookTrip = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { rideId, seatsBooked } = reqData;
  const ride = db.rides.find(r => r._id === rideId);
  if (!ride || ride.status !== 'OPEN') return { status: 404, data: { error: 'Ride unavailable' } };

  const seats = parseInt(seatsBooked, 10) || 1;
  ride.availableSeats -= seats;
  if (ride.availableSeats === 0) ride.status = 'IN_PROGRESS';

  const newTrip = {
    _id: 'trip_' + Date.now(),
    rideId: ride._id,
    driverId: ride.driverId,
    driverName: ride.driverName,
    passengerId: user.userId,
    passengerName: user.name,
    vehicleId: ride.vehicleId,
    vehicleModel: ride.vehicleModel,
    organizationId: user.organizationId,
    seatsBooked: seats,
    totalFare: ride.farePerSeat * seats,
    pickupLocation: ride.pickupLocation,
    destinationLocation: ride.destinationLocation,
    status: 'BOOKED',
    paymentStatus: 'PENDING',
    paymentMethod: 'WALLET',
    createdAt: new Date().toISOString()
  };
  db.trips.push(newTrip);
  return { status: 201, data: newTrip };
};

const getMyTrips = (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const myTrips = db.trips.filter(t => t.passengerId === user.userId || t.driverId === user.userId);
  return { status: 200, data: myTrips };
};

const updateTripStatus = (user, tripId, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { status } = reqData;
  const trip = db.trips.find(t => t._id === tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };
  trip.status = status;
  return { status: 200, data: trip };
};

module.exports = {
  bookTrip,
  getMyTrips,
  updateTripStatus
};

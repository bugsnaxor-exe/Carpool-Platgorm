const db = require('../config/db');

const bookTrip = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { rideId, seatsBooked } = reqData;
  const ride = db.rides.find(r => r._id === rideId);
  if (!ride || ride.status !== 'OPEN') return { status: 404, data: { error: 'Ride unavailable' } };

  const seats = parseInt(seatsBooked, 10) || 1;
  ride.availableSeats -= seats;
  if (ride.availableSeats === 0) ride.status = 'IN_PROGRESS';

  const co2SavedKg = (14.5 * 0.12 * seats).toFixed(2);

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
    co2SavedKg: parseFloat(co2SavedKg),
    pickupLocation: ride.pickupLocation,
    destinationLocation: ride.destinationLocation,
    waypoints: ride.waypoints || [],
    status: 'BOOKED',
    paymentStatus: 'PENDING',
    paymentMethod: 'WALLET',
    sosAlert: false,
    createdAt: new Date().toISOString()
  };
  db.trips.push(newTrip);

  db.auditLogs.push({
    _id: 'log_' + Date.now(),
    performedBy: user.userId,
    action: 'BOOK_TRIP',
    targetType: 'Trip',
    details: `Booked ${seats} seat(s) for ₹${newTrip.totalFare} (${co2SavedKg}kg CO₂ saved)`,
    timestamp: new Date().toISOString()
  });

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

const triggerSOS = (user, tripId, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const trip = db.trips.find(t => t._id === tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  trip.sosAlert = true;
  const sosEvent = {
    _id: 'sos_' + Date.now(),
    tripId: trip._id,
    triggeredBy: user.userId,
    userName: user.name,
    lat: reqData.lat || 12.9279,
    lng: reqData.lng || 77.6772,
    timestamp: new Date().toISOString()
  };

  db.auditLogs.push({
    _id: 'log_' + Date.now(),
    performedBy: user.userId,
    action: 'EMERGENCY_SOS_TRIGGERED',
    targetType: 'Safety',
    details: `CRITICAL: Emergency SOS activated by ${user.name} during trip ${trip._id} at GPS (${sosEvent.lat}, ${sosEvent.lng})`,
    timestamp: new Date().toISOString()
  });

  return { status: 200, data: { message: 'EMERGENCY SOS ALERT ACTIVATED! Corporate Security & Admin Notified.', sosEvent } };
};

const getReceipt = (user, tripId) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const trip = db.trips.find(t => t._id === tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  const receipt = {
    receiptNumber: 'RCP-' + trip._id.toUpperCase(),
    issueDate: new Date().toLocaleDateString(),
    passengerName: trip.passengerName,
    driverName: trip.driverName,
    vehicle: trip.vehicleModel,
    pickup: trip.pickupLocation.name || trip.pickupLocation,
    destination: trip.destinationLocation.name || trip.destinationLocation,
    seats: trip.seatsBooked,
    fareAmount: `₹${trip.totalFare.toFixed(2)}`,
    co2Saved: `${trip.co2SavedKg} kg`,
    paymentStatus: trip.paymentStatus,
    organization: 'Acme Corporation'
  };

  return { status: 200, data: receipt };
};

module.exports = {
  bookTrip,
  getMyTrips,
  updateTripStatus,
  triggerSOS,
  getReceipt
};

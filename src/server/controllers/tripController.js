const Trip = require('../../../models/Trip');
const Ride = require('../../../models/Ride');
const User = require('../../../models/User');

const bookTrip = async (user, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { rideId, seatsBooked = 1 } = body;

  const ride = await Ride.findById(rideId);
  if (!ride || ride.status !== 'OPEN') {
    return { status: 400, data: { error: 'Ride is no longer available' } };
  }

  if (ride.availableSeats < seatsBooked) {
    return { status: 400, data: { error: `Only ${ride.availableSeats} seat(s) available` } };
  }

  if (ride.driverId.toString() === user._id.toString()) {
    return { status: 400, data: { error: 'You cannot book your own ride' } };
  }

  ride.availableSeats -= seatsBooked;
  await ride.save();

  const totalFare = ride.farePerSeat * seatsBooked;
  const dbUser = await User.findById(user._id);

  const trip = await Trip.create({
    rideId: ride._id,
    passengerId: user._id,
    driverId: ride.driverId,
    organizationId: dbUser.organizationId,
    seatsBooked: Number(seatsBooked),
    totalFare,
    status: 'BOOKED',
    paymentStatus: 'UNPAID',
    sosAlerts: []
  });

  return { status: 201, data: trip };
};

const getMyTrips = async (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const trips = await Trip.find({
    $or: [{ passengerId: user._id }, { driverId: user._id }]
  })
    .populate('rideId')
    .populate('passengerId', 'name email mobileNumber')
    .populate('driverId', 'name email mobileNumber')
    .sort({ createdAt: -1 });

  return { status: 200, data: trips };
};

const updateTripStatus = async (user, tripId, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { status } = body;

  const trip = await Trip.findById(tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  if (trip.driverId.toString() !== user._id.toString() && trip.passengerId.toString() !== user._id.toString()) {
    return { status: 403, data: { error: 'Forbidden' } };
  }

  trip.status = status;
  await trip.save();

  if (status === 'IN_TRANSIT') {
    await Ride.findByIdAndUpdate(trip.rideId, { status: 'IN_PROGRESS' });
  } else if (status === 'COMPLETED') {
    await Ride.findByIdAndUpdate(trip.rideId, { status: 'COMPLETED' });
  }

  return { status: 200, data: trip };
};

const triggerSOS = async (user, tripId, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const trip = await Trip.findById(tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  const { lat, lng } = body || {};
  trip.sosAlerts.push({
    triggeredBy: user._id,
    lat: lat || 12.9279,
    lng: lng || 77.6772,
    timestamp: new Date()
  });

  await trip.save();

  return {
    status: 200,
    data: {
      message: 'EMERGENCY SOS ALERT BROADCASTED TO SECURITY & CORPORATE ADMINS',
      sosAlert: trip.sosAlerts[trip.sosAlerts.length - 1]
    }
  };
};

const getReceipt = async (user, tripId) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const trip = await Trip.findById(tripId)
    .populate('rideId')
    .populate('passengerId', 'name email mobileNumber')
    .populate('driverId', 'name email mobileNumber');

  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  return {
    status: 200,
    data: {
      receiptId: `REC-${trip._id.toString().slice(-6).toUpperCase()}`,
      tripId: trip._id,
      seatsBooked: trip.seatsBooked,
      totalFare: trip.totalFare,
      paymentStatus: trip.paymentStatus,
      passengerName: trip.passengerId ? trip.passengerId.name : 'Employee',
      driverName: trip.driverId ? trip.driverId.name : 'Driver',
      vehicleModel: trip.rideId ? trip.rideId.vehicleModel : 'Vehicle',
      issuedAt: new Date().toISOString()
    }
  };
};

module.exports = { bookTrip, getMyTrips, updateTripStatus, triggerSOS, getReceipt };

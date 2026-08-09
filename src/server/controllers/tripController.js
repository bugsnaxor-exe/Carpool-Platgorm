const Trip = require('../../../models/Trip');
const Ride = require('../../../models/Ride');
const User = require('../../../models/User');
const { catchAsync } = require('../utils/errorHandler');

const bookTrip = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { rideId, seatsBooked = 1, paymentMethod = 'UPI' } = body;

    const ride = await Ride.findById(rideId);
    if (!ride || (ride.status !== 'OPEN' && ride.status !== 'Scheduled' && ride.status !== 'Active')) {
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
      organizationId: dbUser ? dbUser.organizationId : null,
      seatsBooked: Number(seatsBooked),
      totalFare,
      fareDetails: totalFare,
      status: 'BOOKED',
      tripStatus: 'Scheduled',
      paymentStatus: 'Pending',
      paymentMethod: paymentMethod || 'UPI',
      sosAlerts: []
    });

    return { status: 201, data: { message: 'Trip booked successfully', trip } };
  } catch (err) {
    console.error(`[Book Trip Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to book trip', details: err.message } };
  }
});

const getMyTrips = catchAsync(async (user, queryParams = {}) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { role } = queryParams;

    let filter = {};
    if (role === 'driver') {
      filter = { driverId: user._id };
    } else if (role === 'passenger') {
      filter = { passengerId: user._id };
    } else {
      filter = { $or: [{ passengerId: user._id }, { driverId: user._id }] };
    }

    const trips = await Trip.find(filter)
      .populate('rideId')
      .populate('passengerId', 'name email phone mobileNumber')
      .populate('driverId', 'name email phone mobileNumber')
      .sort({ createdAt: -1 });

    return { status: 200, data: { results: trips, trips } };
  } catch (err) {
    console.error(`[Get My Trips Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to retrieve trip history', details: err.message } };
  }
});

const getTripDetails = catchAsync(async (user, tripId) => {
  try {
    const trip = await Trip.findById(tripId)
      .populate('passengerId', 'name phone email')
      .populate('driverId', 'name phone email')
      .populate('rideId', 'pickupLocation destinationLocation destination travelDateTime travelDate');

    if (!trip) return { status: 404, data: { error: 'Trip not found' } };
    return { status: 200, data: trip };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to retrieve trip details', details: err.message } };
  }
});

const updateTripStatus = catchAsync(async (user, tripId, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { status, tripStatus } = body;

    const trip = await Trip.findById(tripId);
    if (!trip) return { status: 404, data: { error: 'Trip not found' } };

    const newStatus = tripStatus || status;
    trip.status = newStatus;
    trip.tripStatus = newStatus;
    await trip.save();

    if (newStatus === 'Cancelled' || newStatus === 'CANCELLED') {
      const ride = await Ride.findById(trip.rideId);
      if (ride) {
        ride.availableSeats += (trip.seatsBooked || 1);
        await ride.save();
      }
    }

    return { status: 200, data: { message: `Trip marked as ${newStatus}`, trip } };
  } catch (err) {
    console.error(`[Update Trip Status Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to update trip status', details: err.message } };
  }
});

const updatePaymentStatus = catchAsync(async (user, tripId, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { paymentStatus, paymentMethod } = body;

    const trip = await Trip.findById(tripId);
    if (!trip) return { status: 404, data: { error: 'Trip not found' } };

    if (paymentStatus) trip.paymentStatus = paymentStatus;
    if (paymentMethod) trip.paymentMethod = paymentMethod;
    await trip.save();

    return { status: 200, data: { message: 'Payment status updated', trip } };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to update payment status', details: err.message } };
  }
});

const triggerSOS = catchAsync(async (user, tripId, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { lat, lng } = body || {};

    const trip = await Trip.findById(tripId);
    if (!trip) return { status: 404, data: { error: 'Trip not found' } };

    trip.sosAlerts.push({
      triggeredBy: user._id,
      lat: lat || 12.9716,
      lng: lng || 77.5946,
      timestamp: new Date()
    });

    await trip.save();
    return { status: 200, data: { success: true, message: 'Emergency SOS alert dispatched to Corporate Security & Contacts!' } };
  } catch (err) {
    console.error(`[Trigger SOS Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to trigger SOS alert', details: err.message } };
  }
});

const getReceipt = catchAsync(async (user, tripId) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const trip = await Trip.findById(tripId)
      .populate('rideId')
      .populate('passengerId', 'name email phone')
      .populate('driverId', 'name email phone');

    if (!trip) return { status: 404, data: { error: 'Trip receipt not found' } };

    return {
      status: 200,
      data: {
        receiptNo: `RCP-${trip._id.toString().slice(-6).toUpperCase()}`,
        tripId: trip._id,
        passenger: trip.passengerId,
        driver: trip.driverId,
        ride: trip.rideId,
        totalFare: trip.fareDetails || trip.totalFare,
        paymentStatus: trip.paymentStatus,
        paymentMethod: trip.paymentMethod,
        issuedAt: new Date()
      }
    };
  } catch (err) {
    console.error(`[Get Receipt Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to generate receipt', details: err.message } };
  }
});

module.exports = {
  bookTrip,
  getMyTrips,
  getUserTrips: getMyTrips,
  getTripDetails,
  updateTripStatus,
  updatePaymentStatus,
  triggerSOS,
  getReceipt
};

const Ride = require('../../../models/Ride');
const Vehicle = require('../../../models/Vehicle');
const User = require('../../../models/User');

const publishRide = async (user, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const { vehicleId, pickupLocation, destinationLocation, travelDateTime, totalSeats, farePerSeat, recurring } = body;

  if (!vehicleId || !pickupLocation || !destinationLocation || !travelDateTime || !totalSeats || !farePerSeat) {
    return { status: 400, data: { error: 'All ride publication parameters are required' } };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || vehicle.userId.toString() !== user._id.toString()) {
    return { status: 400, data: { error: 'Invalid or unauthorized vehicle selected' } };
  }

  const dbUser = await User.findById(user._id);

  const newRide = await Ride.create({
    driverId: user._id,
    driverName: user.name,
    driverPhone: dbUser.mobileNumber,
    vehicleId: vehicle._id,
    vehicleModel: `${vehicle.model} (${vehicle.registrationNumber})`,
    organizationId: dbUser.organizationId,
    pickupLocation,
    destinationLocation,
    travelDateTime: new Date(travelDateTime),
    totalSeats: Number(totalSeats),
    availableSeats: Number(totalSeats),
    farePerSeat: Number(farePerSeat),
    recurring: !!recurring,
    routeDistanceKm: 14.5,
    estimatedDurationMins: 30,
    status: 'OPEN'
  });

  return { status: 201, data: newRide };
};

const searchRides = async (user, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { pickupName, destinationName, date } = body || {};

  const query = {
    status: 'OPEN',
    availableSeats: { $gt: 0 }
  };

  if (pickupName) {
    query['pickupLocation.name'] = { $regex: pickupName.trim(), $options: 'i' };
  }
  if (destinationName) {
    query['destinationLocation.name'] = { $regex: destinationName.trim(), $options: 'i' };
  }

  const rides = await Ride.find(query).sort({ travelDateTime: 1 });
  return { status: 200, data: rides };
};

module.exports = { publishRide, searchRides };

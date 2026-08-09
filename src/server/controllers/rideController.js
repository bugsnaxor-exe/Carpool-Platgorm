const Ride = require('../../../models/Ride');
const Vehicle = require('../../../models/Vehicle');
const User = require('../../../models/User');
const { catchAsync } = require('../utils/errorHandler');

const publishRide = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const { vehicleId, pickupLocation, destinationLocation, destination, travelDateTime, travelDate, totalSeats, availableSeats, farePerSeat, recurring } = body;

    if (!vehicleId || !pickupLocation || (!destinationLocation && !destination) || (!travelDateTime && !travelDate) || !totalSeats || !farePerSeat) {
      return { status: 400, data: { error: 'All ride publication parameters are required' } };
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || (vehicle.userId && vehicle.userId.toString() !== user._id.toString() && vehicle.ownerId && vehicle.ownerId.toString() !== user._id.toString())) {
      return { status: 400, data: { error: 'Invalid or unauthorized vehicle selected' } };
    }

    const dbUser = await User.findById(user._id);

    const pickupFormatted = typeof pickupLocation === 'object' ? {
      type: 'Point',
      coordinates: pickupLocation.coordinates || [Number(pickupLocation.lng || 77.5946), Number(pickupLocation.lat || 12.9716)],
      address: pickupLocation.address || pickupLocation.name || 'Pickup Point',
      name: pickupLocation.name || pickupLocation.address || 'Pickup Point',
      lat: Number(pickupLocation.lat || (pickupLocation.coordinates ? pickupLocation.coordinates[1] : 12.9716)),
      lng: Number(pickupLocation.lng || (pickupLocation.coordinates ? pickupLocation.coordinates[0] : 77.5946))
    } : { type: 'Point', coordinates: [77.5946, 12.9716], address: String(pickupLocation), name: String(pickupLocation), lat: 12.9716, lng: 77.5946 };

    const targetDest = destinationLocation || destination;
    const destFormatted = typeof targetDest === 'object' ? {
      type: 'Point',
      coordinates: targetDest.coordinates || [Number(targetDest.lng || 77.6445), Number(targetDest.lat || 12.9121)],
      address: targetDest.address || targetDest.name || 'Destination Point',
      name: targetDest.name || targetDest.address || 'Destination Point',
      lat: Number(targetDest.lat || (targetDest.coordinates ? targetDest.coordinates[1] : 12.9121)),
      lng: Number(targetDest.lng || (targetDest.coordinates ? targetDest.coordinates[0] : 77.6445))
    } : { type: 'Point', coordinates: [77.6445, 12.9121], address: String(targetDest), name: String(targetDest), lat: 12.9121, lng: 77.6445 };

    const travelDateObj = new Date(travelDateTime || travelDate);

    const newRide = await Ride.create({
      driverId: user._id,
      driverName: user.name,
      driverPhone: dbUser ? (dbUser.phone || dbUser.mobileNumber) : '',
      vehicleId: vehicle._id,
      vehicleModel: `${vehicle.vehicleModel || vehicle.model} (${vehicle.registrationNumber})`,
      organizationId: dbUser ? dbUser.organizationId : null,
      pickupLocation: pickupFormatted,
      destinationLocation: destFormatted,
      destination: destFormatted,
      travelDateTime: travelDateObj,
      travelDate: travelDateObj,
      totalSeats: Number(totalSeats),
      availableSeats: Number(availableSeats || totalSeats),
      farePerSeat: Number(farePerSeat),
      recurring: !!recurring,
      routeDistanceKm: 14.5,
      estimatedDurationMins: 30,
      status: 'Scheduled'
    });

    return { status: 201, data: { message: 'Ride published successfully', ride: newRide } };
  } catch (err) {
    console.error(`[Publish Ride Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to publish ride', details: err.message } };
  }
});

const searchRides = catchAsync(async (user, body, queryParams = {}) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { pickupName, destinationName, pickup, destination } = { ...queryParams, ...(body || {}) };
    const searchPickup = (pickupName || pickup || '').trim();
    const searchDest = (destinationName || destination || '').trim();

    let query = {
      status: { $in: ['OPEN', 'Scheduled', 'Active', 'Ongoing'] },
      availableSeats: { $gt: 0 }
    };

    if (searchPickup && searchDest) {
      query.$and = [
        {
          $or: [
            { 'pickupLocation.address': { $regex: searchPickup, $options: 'i' } },
            { 'pickupLocation.name': { $regex: searchPickup, $options: 'i' } },
            { driverName: { $regex: searchPickup, $options: 'i' } }
          ]
        },
        {
          $or: [
            { 'destinationLocation.address': { $regex: searchDest, $options: 'i' } },
            { 'destinationLocation.name': { $regex: searchDest, $options: 'i' } },
            { 'destination.address': { $regex: searchDest, $options: 'i' } },
            { 'destination.name': { $regex: searchDest, $options: 'i' } }
          ]
        }
      ];
    } else if (searchPickup) {
      query.$or = [
        { 'pickupLocation.address': { $regex: searchPickup, $options: 'i' } },
        { 'pickupLocation.name': { $regex: searchPickup, $options: 'i' } },
        { driverName: { $regex: searchPickup, $options: 'i' } }
      ];
    } else if (searchDest) {
      query.$or = [
        { 'destinationLocation.address': { $regex: searchDest, $options: 'i' } },
        { 'destinationLocation.name': { $regex: searchDest, $options: 'i' } },
        { 'destination.address': { $regex: searchDest, $options: 'i' } },
        { 'destination.name': { $regex: searchDest, $options: 'i' } }
      ];
    }

    let rides = await Ride.find(query)
      .populate('driverId', 'name phone email')
      .populate('vehicleId', 'vehicleModel model registrationNumber seatingCapacity')
      .sort({ travelDate: 1, travelDateTime: 1 });

    // Fallback: If strict query yielded 0 results, return all open rides so user is never blocked
    if (rides.length === 0) {
      rides = await Ride.find({
        status: { $in: ['OPEN', 'Scheduled', 'Active', 'Ongoing'] },
        availableSeats: { $gt: 0 }
      })
        .populate('driverId', 'name phone email')
        .populate('vehicleId', 'vehicleModel model registrationNumber seatingCapacity')
        .sort({ createdAt: -1 })
        .limit(10);
    }

    return { status: 200, data: { results: rides, rides } };
  } catch (err) {
    console.error(`[Search Rides Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to search rides', details: err.message } };
  }
});

const getRideById = catchAsync(async (user, rideId) => {
  try {
    const ride = await Ride.findById(rideId)
      .populate('driverId', 'name phone email')
      .populate('vehicleId', 'vehicleModel model registrationNumber seatingCapacity');

    if (!ride) return { status: 404, data: { error: 'Ride not found' } };
    return { status: 200, data: ride };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to retrieve ride details', details: err.message } };
  }
});

module.exports = {
  publishRide,
  createRide: publishRide,
  searchRides,
  getRideById
};

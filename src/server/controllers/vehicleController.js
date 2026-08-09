const Vehicle = require('../../../models/Vehicle');
const User = require('../../../models/User');
const { catchAsync } = require('../utils/errorHandler');

const getVehicles = catchAsync(async (user) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const vehicles = await Vehicle.find({
      $or: [{ userId: user._id }, { ownerId: user._id }]
    });

    return { status: 200, data: vehicles };
  } catch (err) {
    console.error(`[Get Vehicles Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to retrieve vehicles', details: err.message } };
  }
});

const createVehicle = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const { model, vehicleModel, registrationNumber, seatingCapacity, fuelType, color } = body;
    const targetModel = vehicleModel || model;

    if (!targetModel || !registrationNumber || !seatingCapacity) {
      return { status: 400, data: { error: 'Vehicle model, registration number, and seating capacity are required' } };
    }

    const dbUser = await User.findById(user._id);

    const vehicle = await Vehicle.create({
      userId: user._id,
      ownerId: user._id,
      organizationId: dbUser ? dbUser.organizationId : null,
      model: targetModel.trim(),
      vehicleModel: targetModel.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      seatingCapacity: Number(seatingCapacity),
      fuelType: fuelType || 'EV',
      color: color || 'Black',
      status: 'APPROVED'
    });

    return { status: 201, data: vehicle };
  } catch (err) {
    console.error(`[Create Vehicle Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to register vehicle', details: err.message } };
  }
});

module.exports = { getVehicles, createVehicle };

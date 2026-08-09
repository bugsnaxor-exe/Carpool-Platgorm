const Vehicle = require('../../../models/Vehicle');
const User = require('../../../models/User');
const { catchAsync } = require('../utils/errorHandler');

const getUserVehicles = catchAsync(async (user) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const vehicles = await Vehicle.find({
      $or: [{ userId: user._id }, { ownerId: user._id }]
    }).sort({ createdAt: -1 });

    return { status: 200, data: { results: vehicles, vehicles } };
  } catch (err) {
    console.error(`[Get Vehicles Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to retrieve vehicles', details: err.message } };
  }
});

const createVehicle = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const { model, vehicleModel, registrationNumber, seatingCapacity, fuelType, color, ownerId } = body;
    const targetModel = vehicleModel || model;

    if (!targetModel || !registrationNumber || !seatingCapacity) {
      return { status: 400, data: { error: 'Vehicle model, registration number, and seating capacity are required' } };
    }

    const dbUser = await User.findById(user._id);

    const vehicle = await Vehicle.create({
      userId: user._id,
      ownerId: ownerId || user._id,
      organizationId: dbUser ? dbUser.organizationId : null,
      model: targetModel.trim(),
      vehicleModel: targetModel.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      seatingCapacity: Number(seatingCapacity),
      fuelType: fuelType || 'EV',
      color: color || 'Black',
      status: 'APPROVED'
    });

    return { status: 201, data: { message: 'Vehicle added successfully', vehicle } };
  } catch (err) {
    console.error(`[Create Vehicle Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to register vehicle', details: err.message } };
  }
});

const updateVehicle = catchAsync(async (user, vehicleId, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const updatedVehicle = await Vehicle.findByIdAndUpdate(vehicleId, body, {
      new: true,
      runValidators: true
    });

    if (!updatedVehicle) {
      return { status: 404, data: { error: 'Vehicle not found' } };
    }

    return { status: 200, data: { message: 'Vehicle updated', vehicle: updatedVehicle } };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to update vehicle', details: err.message } };
  }
});

const deleteVehicle = catchAsync(async (user, vehicleId) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const deletedVehicle = await Vehicle.findByIdAndDelete(vehicleId);
    if (!deletedVehicle) {
      return { status: 404, data: { error: 'Vehicle not found' } };
    }

    return { status: 200, data: { message: 'Vehicle removed successfully' } };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to delete vehicle', details: err.message } };
  }
});

module.exports = {
  getVehicles: getUserVehicles,
  getUserVehicles,
  createVehicle,
  addVehicle: createVehicle,
  updateVehicle,
  deleteVehicle
};

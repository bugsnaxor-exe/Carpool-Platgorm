const Vehicle = require('../../../models/Vehicle');
const User = require('../../../models/User');

const getVehicles = async (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const vehicles = await Vehicle.find({ userId: user._id });
  return { status: 200, data: vehicles };
};

const createVehicle = async (user, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { model, registrationNumber, seatingCapacity, fuelType, color } = body;

  if (!model || !registrationNumber || !seatingCapacity) {
    return { status: 400, data: { error: 'Model, Registration, and Seating capacity are required' } };
  }

  const dbUser = await User.findById(user._id);
  if (!dbUser) return { status: 404, data: { error: 'User not found' } };

  const newVehicle = await Vehicle.create({
    userId: user._id,
    organizationId: dbUser.organizationId,
    model: model.trim(),
    registrationNumber: registrationNumber.trim().toUpperCase(),
    seatingCapacity: Number(seatingCapacity),
    fuelType: fuelType || 'EV',
    color: color || 'Black',
    status: 'APPROVED'
  });

  return { status: 201, data: newVehicle };
};

module.exports = { getVehicles, createVehicle };

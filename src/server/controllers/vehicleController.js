const db = require('../config/db');

const getVehicles = (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const myVehicles = db.vehicles.filter(v => v.userId === user.userId);
  return { status: 200, data: myVehicles };
};

const createVehicle = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { model, registrationNumber, seatingCapacity, fuelType } = reqData;
  const newVeh = {
    _id: 'veh_' + Date.now(),
    userId: user.userId,
    organizationId: user.organizationId,
    model,
    registrationNumber: registrationNumber.toUpperCase(),
    seatingCapacity: parseInt(seatingCapacity, 10),
    fuelType: fuelType || 'PETROL',
    status: 'APPROVED'
  };
  db.vehicles.push(newVeh);
  return { status: 201, data: newVeh };
};

module.exports = {
  getVehicles,
  createVehicle
};

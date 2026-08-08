const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  model: { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, uppercase: true, trim: true },
  seatingCapacity: { type: Number, required: true, min: 1 },
  fuelType: { type: String, enum: ['EV', 'HYBRID', 'PETROL', 'DIESEL', 'CNG'], default: 'EV' },
  color: { type: String, default: 'Black' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

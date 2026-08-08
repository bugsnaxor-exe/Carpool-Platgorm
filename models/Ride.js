const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
});

const rideSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: { type: String, required: true },
  driverPhone: { type: String },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  vehicleModel: { type: String, required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  pickupLocation: { type: locationSchema, required: true },
  destinationLocation: { type: locationSchema, required: true },
  travelDateTime: { type: Date, required: true },
  totalSeats: { type: Number, required: true, min: 1 },
  availableSeats: { type: Number, required: true, min: 0 },
  farePerSeat: { type: Number, required: true, min: 0 },
  recurring: { type: Boolean, default: false },
  routeDistanceKm: { type: Number, default: 10.0 },
  estimatedDurationMins: { type: Number, default: 25 },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'OPEN' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', rideSchema);

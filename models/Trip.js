const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number },
  lng: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

const tripSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  seatsBooked: { type: Number, required: true, default: 1 },
  totalFare: { type: Number, required: true },
  status: { type: String, enum: ['BOOKED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'], default: 'BOOKED' },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED'], default: 'UNPAID' },
  sosAlerts: [sosAlertSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Trip', tripSchema);

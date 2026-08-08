const mongoose = require('mongoose');

// Location sub-schema compatible with both GeoJSON Point and Flat Address lat/lng
const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point' },
  coordinates: { type: [Number], default: [77.5946, 12.9716] }, // [lng, lat]
  address: { type: String, trim: true },
  name: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number }
});

const rideSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverName: { type: String },
    driverPhone: { type: String },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    vehicleModel: { type: String },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    
    pickupLocation: { type: locationSchema, required: true },
    destinationLocation: { type: locationSchema, required: true },
    
    travelDateTime: { type: Date },
    travelDate: { type: Date }, // Backend2 Field Alias
    
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    farePerSeat: { type: Number, required: true, min: 0 },
    
    recurring: { type: Boolean, default: false },
    routeDistanceKm: { type: Number, default: 10.0 },
    estimatedDurationMins: { type: Number, default: 25 },
    
    status: { 
      type: String, 
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'OPEN', 'IN_PROGRESS'], 
      default: 'OPEN' 
    }
  },
  { timestamps: true }
);

// Pre-save hook: ensure travelDate and travelDateTime stay synced
rideSchema.pre('save', function (next) {
  if (this.travelDateTime && !this.travelDate) {
    this.travelDate = this.travelDateTime;
  } else if (this.travelDate && !this.travelDateTime) {
    this.travelDateTime = this.travelDate;
  }
  next();
});

module.exports = mongoose.model('Ride', rideSchema);

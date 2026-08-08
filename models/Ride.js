const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true }, // [lng, lat]
  address: { type: String, required: true, trim: true },
  name: { type: String, trim: true },
  lat: { type: Number },
  lng: { type: Number }
}, { _id: true, strict: false });

const rideSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    pickupLocation: { type: locationSchema, required: true },
    destinationLocation: { type: locationSchema },
    destination: { type: locationSchema },
    travelDate: { type: Date },
    travelDateTime: { type: Date },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true },
    farePerSeat: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'Active', 'OPEN'],
      default: 'Scheduled'
    }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

rideSchema.pre('save', function (next) {
  if (this.travelDate && !this.travelDateTime) {
    this.travelDateTime = this.travelDate;
  } else if (this.travelDateTime && !this.travelDate) {
    this.travelDate = this.travelDateTime;
  }

  if (this.pickupLocation && this.pickupLocation.coordinates && this.pickupLocation.coordinates.length === 2) {
    this.pickupLocation.lng = this.pickupLocation.coordinates[0];
    this.pickupLocation.lat = this.pickupLocation.coordinates[1];
  }

  if (this.destination && !this.destinationLocation) {
    this.destinationLocation = this.destination;
  } else if (this.destinationLocation && !this.destination) {
    this.destination = this.destinationLocation;
  }
  next();
});

rideSchema.index({ pickupLocation: '2dsphere', travelDate: 1, status: 1 });
rideSchema.index({ destination: '2dsphere', travelDate: 1, status: 1 });

module.exports = mongoose.model('Ride', rideSchema);

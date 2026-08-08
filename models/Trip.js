const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fareDetails: {
      type: Number,
      required: true
    },
    totalFare: { type: Number },
    tripStatus: {
      type: String,
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'BOOKED', 'IN_TRANSIT'],
      default: 'Scheduled'
    },
    status: { type: String, default: 'BOOKED' },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed', 'UNPAID', 'PAID'],
      default: 'Pending'
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'Card', 'UPI', 'Wallet', 'Internal Wallet Transfer', 'Razorpay'],
      default: 'UPI'
    }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

tripSchema.pre('save', function (next) {
  if (this.fareDetails !== undefined && this.totalFare === undefined) {
    this.totalFare = this.fareDetails;
  } else if (this.totalFare !== undefined && this.fareDetails === undefined) {
    this.fareDetails = this.totalFare;
  }

  if (this.tripStatus && !this.status) {
    this.status = this.tripStatus;
  } else if (this.status && !this.tripStatus) {
    this.tripStatus = this.status;
  }
  next();
});

module.exports = mongoose.model('Trip', tripSchema);

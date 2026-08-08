const mongoose = require('mongoose');

const sosAlertSchema = new mongoose.Schema({
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number },
  lng: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

const tripSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    
    seatsBooked: { type: Number, default: 1 },
    totalFare: { type: Number },
    fareDetails: { type: Number }, // Backend2 Field Alias
    
    status: { 
      type: String, 
      enum: ['BOOKED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'Scheduled', 'Ongoing'], 
      default: 'BOOKED' 
    },
    tripStatus: { 
      type: String, 
      enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled', 'BOOKED', 'IN_TRANSIT'], 
      default: 'Scheduled' 
    },
    
    paymentStatus: { 
      type: String, 
      enum: ['UNPAID', 'PAID', 'REFUNDED', 'Pending', 'Completed', 'Failed'], 
      default: 'UNPAID' 
    },
    paymentMethod: { 
      type: String, 
      enum: ['Cash', 'Card', 'UPI', 'Wallet', 'Razorpay'], 
      default: 'UPI' 
    },
    
    sosAlerts: [sosAlertSchema]
  },
  { timestamps: true }
);

// Pre-save hook: ensure totalFare & fareDetails and status & tripStatus stay synced
tripSchema.pre('save', function (next) {
  if (this.totalFare && !this.fareDetails) {
    this.fareDetails = this.totalFare;
  } else if (this.fareDetails && !this.totalFare) {
    this.totalFare = this.fareDetails;
  }

  if (this.status && !this.tripStatus) {
    this.tripStatus = this.status;
  } else if (this.tripStatus && !this.status) {
    this.status = this.tripStatus;
  }
  next();
});

module.exports = mongoose.model('Trip', tripSchema);

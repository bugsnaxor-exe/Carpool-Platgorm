const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    vehicleModel: { type: String, required: true, trim: true },
    model: { type: String, trim: true },
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    seatingCapacity: { type: Number, required: true, min: 1 },
    fuelType: { type: String, enum: ['EV', 'HYBRID', 'PETROL', 'DIESEL', 'CNG'], default: 'PETROL' },
    status: { type: String, default: 'APPROVED' }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

vehicleSchema.pre('save', function (next) {
  if (this.ownerId && !this.userId) {
    this.userId = this.ownerId;
  } else if (this.userId && !this.ownerId) {
    this.ownerId = this.userId;
  }

  if (this.vehicleModel && !this.model) {
    this.model = this.vehicleModel;
  } else if (this.model && !this.vehicleModel) {
    this.vehicleModel = this.model;
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

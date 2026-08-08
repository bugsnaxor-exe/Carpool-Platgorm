const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Backend2 Field Alias
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    
    model: { type: String, trim: true },
    vehicleModel: { type: String, trim: true }, // Backend2 Field Alias
    
    registrationNumber: { type: String, required: true, uppercase: true, trim: true },
    seatingCapacity: { type: Number, required: true, min: 1 },
    
    fuelType: { type: String, enum: ['EV', 'HYBRID', 'PETROL', 'DIESEL', 'CNG'], default: 'EV' },
    color: { type: String, default: 'Black' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' }
  },
  { timestamps: true }
);

// Pre-save hook: sync userId & ownerId and model & vehicleModel
vehicleSchema.pre('save', function (next) {
  if (this.userId && !this.ownerId) {
    this.ownerId = this.userId;
  } else if (this.ownerId && !this.userId) {
    this.userId = this.ownerId;
  }

  if (this.model && !this.vehicleModel) {
    this.vehicleModel = this.model;
  } else if (this.vehicleModel && !this.model) {
    this.model = this.vehicleModel;
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

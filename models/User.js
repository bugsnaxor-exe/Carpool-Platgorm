const mongoose = require('mongoose');

// Saved Commute Location Sub-Schema
const savedPlaceSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true }, // e.g. "Home", "HQ Office", "Gym"
  address: { type: String, required: true, trim: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  isDefault: { type: Boolean, default: false }
});

// Mobility Preferences Sub-Schema
const preferenceSchema = new mongoose.Schema({
  womenOnlyRides: { type: Boolean, default: false },
  chatNotification: { type: Boolean, default: true },
  musicAllowed: { type: Boolean, default: true },
  smokingAllowed: { type: Boolean, default: false },
  petFriendly: { type: Boolean, default: false },
  quietRide: { type: Boolean, default: false }
});

// Comprehensive User Credentials & Enterprise Values Schema
const userSchema = new mongoose.Schema(
  {
    // Credentials & Authentication Values
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true, index: true },
    password: { type: String, required: true }, // Scrypt Salted Password Hash
    
    // Verification & Security Flags
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: Date.now },

    // Corporate & Employee Values
    employeeId: { type: String, trim: true },
    role: { 
      type: String, 
      enum: ['COMPANY_ADMIN', 'EMPLOYEE', 'DRIVER_MANAGER'], 
      default: 'EMPLOYEE' 
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    department: { type: String, default: 'General', trim: true },
    designation: { type: String, default: 'Team Member', trim: true },

    // User Profile Values & Mobility Attributes
    profilePicture: { type: String, default: '' },
    gender: { 
      type: String, 
      enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'], 
      default: 'PREFER_NOT_TO_SAY' 
    },
    rating: { type: Number, default: 5.0, min: 1.0, max: 5.0 },
    totalRidesCount: { type: Number, default: 0 },
    
    // Preferences & Locations
    preferences: { type: preferenceSchema, default: () => ({}) },
    savedPlaces: [savedPlaceSchema],

    // Account Lifecycle Status
    status: { 
      type: String, 
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'], 
      default: 'ACTIVE' 
    }
  },
  {
    timestamps: true // Automatically maintains createdAt and updatedAt
  }
);

// Helper method to strip sensitive credentials (like hashed password) when returning User objects
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

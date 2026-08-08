const mongoose = require('mongoose');

// Saved Commute Location Sub-Schema (Backend2 & Platform Compatible)
const savedPlaceSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  address: { type: String, trim: true },
  lat: { type: mongoose.Schema.Types.Mixed }, // Supports both Number and String from Backend2
  lng: { type: mongoose.Schema.Types.Mixed },
  isDefault: { type: Boolean, default: false }
}, { strict: false });

// Mobility Preferences Sub-Schema
const preferenceSchema = new mongoose.Schema({
  womenOnlyRides: { type: Boolean, default: false },
  chatNotification: { type: Boolean, default: true },
  musicAllowed: { type: Boolean, default: true },
  smokingAllowed: { type: Boolean, default: false },
  petFriendly: { type: Boolean, default: false },
  quietRide: { type: Boolean, default: false }
}, { strict: false });

// User Schema (Merged Backend2 & Carpool Enterprise Schema)
const userSchema = new mongoose.Schema(
  {
    // Credentials & Authentication Values (Backend2 & Enterprise)
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    mobileNumber: { type: String, required: true, unique: true, trim: true, index: true },
    phone: { type: String, trim: true }, // Backend2 Field Alias
    password: { type: String, required: true }, // Hashed Password
    
    // OTP Fields (Backend2 & Email Service)
    otp: { type: String },
    otpExpires: { type: Date },

    // Wallet Balance (Backend2 Direct Field)
    wallet: { type: Number, default: 1250 },

    // Verification & Enhanced Login Tracking Fields
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 1 },
    lastLoginIp: { type: String, default: '127.0.0.1' },
    loginDevice: { type: String, default: 'Web Desktop Shell' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    preferredAuthMethod: { 
      type: String, 
      enum: ['PASSWORD', 'EMAIL_OTP', 'PHONE_OTP'], 
      default: 'EMAIL_OTP' 
    },

    // Corporate & Employee Values (Backend2: "Employee" | "Admin" | "COMPANY_ADMIN")
    employeeId: { type: String, trim: true },
    role: { 
      type: String, 
      enum: ['COMPANY_ADMIN', 'EMPLOYEE', 'Employee', 'Admin', 'DRIVER_MANAGER'], 
      default: 'EMPLOYEE' 
    },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: false, index: true },
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
    
    // Preferences & Saved Places
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
    strict: false, // Guarantees all Backend2 schema fields are saved directly to MongoDB Atlas BSON
    timestamps: true
  }
);

// Pre-save hook: ensure phone & mobileNumber stay strictly in sync
userSchema.pre('save', function (next) {
  if (this.mobileNumber && !this.phone) {
    this.phone = this.mobileNumber;
  } else if (this.phone && !this.mobileNumber) {
    this.mobileNumber = this.phone;
  }
  if (this.wallet === undefined) {
    this.wallet = 1250;
  }
  next();
});

// Helper method to strip sensitive credentials
userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

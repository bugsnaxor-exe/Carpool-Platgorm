const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const savedPlaceSchema = new mongoose.Schema({
  label: { type: String, trim: true },
  address: { type: String, trim: true },
  lat: { type: mongoose.Schema.Types.Mixed },
  lng: { type: mongoose.Schema.Types.Mixed }
}, { _id: true, strict: false });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    mobileNumber: { type: String, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['Employee', 'Admin', 'EMPLOYEE', 'COMPANY_ADMIN'],
      default: 'Employee'
    },
    otp: { type: String },
    otpExpires: { type: Date },
    wallet: { type: Number, default: 500 },
    walletBalance: { type: Number, default: 500 },
    savedPlaces: [savedPlaceSchema],
    status: { type: String, default: 'ACTIVE' },
    emailVerified: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: Date.now },
    loginCount: { type: Number, default: 1 }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

// Pre-save hook to hash password if modified & sync phone/mobileNumber and wallet/walletBalance
userSchema.pre('save', async function () {
  if (this.mobileNumber && !this.phone) {
    this.phone = this.mobileNumber;
  } else if (this.phone && !this.mobileNumber) {
    this.mobileNumber = this.phone;
  }

  if (this.wallet !== undefined && this.walletBalance === undefined) {
    this.walletBalance = this.wallet;
  } else if (this.walletBalance !== undefined && this.wallet === undefined) {
    this.wallet = this.walletBalance;
  }

  if (this.isModified('password') && !this.password.startsWith('$2b$')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpires;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

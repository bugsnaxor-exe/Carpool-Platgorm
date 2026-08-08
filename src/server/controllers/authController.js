const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const Wallet = require('../../../models/Wallet');
const AuditLog = require('../../../models/AuditLog');
const { hashPassword, verifyPassword, generateToken } = require('../utils/security');
const { isDBConnected } = require('../config/db');

// In-Memory OTP Store (email -> { otp, expiresAt })
const otpStore = new Map();

const login = async (body) => {
  if (!isDBConnected()) {
    return { 
      status: 503, 
      data: { error: 'MongoDB Atlas connection pending. Ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0).' } 
    };
  }

  const { identifier, password } = body;

  if (!identifier || !password) {
    return { status: 400, data: { error: 'Email or Mobile Number and password are required' } };
  }

  const rawId = String(identifier).trim();
  const cleanId = rawId.toLowerCase();
  const digitsOnly = rawId.replace(/\D/g, '');

  const user = await User.findOne({
    $or: [
      { email: cleanId },
      { mobileNumber: rawId },
      { mobileNumber: `+${digitsOnly}` },
      { mobileNumber: digitsOnly }
    ]
  }).populate('organizationId');

  if (!user || !verifyPassword(password, user.password)) {
    // Increment failed login attempts
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      await user.save();
    }
    return { status: 401, data: { error: 'Invalid credentials' } };
  }

  // Update Login Metadata in MongoDB
  user.lastLoginAt = new Date();
  user.loginCount = (user.loginCount || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lastLoginIp = '127.0.0.1';
  user.loginDevice = 'Web Browser Shell';
  await user.save();

  const token = generateToken({
    _id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId ? user.organizationId._id.toString() : null
  });

  const wallet = await Wallet.findOne({ userId: user._id });

  await AuditLog.create({
    performedBy: user._id,
    action: 'USER_LOGIN',
    targetType: 'User',
    details: `User ${user.email} logged in (Login #${user.loginCount})`,
    organizationId: user.organizationId ? user.organizationId._id : null
  });

  return {
    status: 200,
    data: {
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        organizationId: user.organizationId ? user.organizationId._id.toString() : null,
        department: user.department,
        savedPlaces: user.savedPlaces,
        walletBalance: wallet ? wallet.balance : 0
      },
      token
    }
  };
};

const sendOtp = async (body) => {
  if (!isDBConnected()) {
    return { status: 503, data: { error: 'MongoDB connection pending.' } };
  }

  const { email } = body;
  if (!email || !email.includes('@')) {
    return { status: 400, data: { error: 'A valid email address is required to receive verification OTP.' } };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check if user already exists
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    return { status: 400, data: { error: `An account with email "${cleanEmail}" already exists. Please sign in instead.` } };
  }

  // Generate 6-digit numeric OTP (e.g. 482915)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(cleanEmail, { otp, expiresAt });

  // Trigger Real Gmail OTP Delivery via Nodemailer if credentials exist in .env
  const { sendRealOtpEmail } = require('../utils/emailService');
  const emailSent = await sendRealOtpEmail(cleanEmail, otp);

  return {
    status: 200,
    data: {
      success: true,
      message: emailSent
        ? `A 6-digit verification code has been delivered to ${cleanEmail}`
        : `Verification code generated for ${cleanEmail}. (Configure EMAIL_USER and EMAIL_PASS in .env for real Gmail inbox delivery)`,
      debugOtp: process.env.NODE_ENV === 'production' && emailSent ? undefined : otp
    }
  };
};

const verifyOtpAndRegister = async (body) => {
  if (!isDBConnected()) {
    return { status: 503, data: { error: 'MongoDB connection pending.' } };
  }

  const { email, otp } = body;

  if (!email || !otp) {
    return { status: 400, data: { error: 'Email and OTP verification code are required' } };
  }

  const cleanEmail = email.trim().toLowerCase();
  const submittedOtp = String(otp).trim();

  const record = otpStore.get(cleanEmail);
  if (!record) {
    return { status: 400, data: { error: 'No verification code found for this email. Please tap Resend OTP.' } };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanEmail);
    return { status: 400, data: { error: 'Verification code has expired. Please tap Resend OTP.' } };
  }

  if (record.otp !== submittedOtp) {
    return { status: 400, data: { error: 'Invalid OTP code. Please check the code and try again.' } };
  }

  // OTP validated! Remove from store
  otpStore.delete(cleanEmail);

  // Complete registration & DB insertion
  return await register(body);
};

const register = async (body) => {
  if (!isDBConnected()) {
    return { 
      status: 503, 
      data: { error: 'MongoDB connection pending. Check your Atlas IP whitelist.' } 
    };
  }

  const { name, email, mobileNumber, password, companyCode, department, role } = body;

  if (!name || (!email && !mobileNumber) || !password) {
    return { status: 400, data: { error: 'Name, Password, and Email or Phone Number are required' } };
  }

  const targetCode = companyCode ? String(companyCode).trim().toUpperCase() : 'ACME';
  let org = await Organization.findOne({ code: targetCode });
  if (!org) {
    org = await Organization.findOne() || await Organization.create({ name: 'Acme Corporation', code: 'ACME' });
  }

  const cleanEmail = email ? email.trim().toLowerCase() : '';
  const cleanMobile = mobileNumber ? mobileNumber.trim() : '';

  if (cleanEmail) {
    const existingByEmail = await User.findOne({ email: cleanEmail });
    if (existingByEmail) {
      return { status: 400, data: { error: `An account with email "${cleanEmail}" already exists. Please select the Login tab to log in.` } };
    }
  }

  if (cleanMobile) {
    const existingByMobile = await User.findOne({ 
      $or: [{ mobileNumber: cleanMobile }, { mobileNumber: `+${cleanMobile.replace(/\D/g, '')}` }] 
    });
    if (existingByMobile) {
      return { status: 400, data: { error: `An account with phone number "${cleanMobile}" already exists. Please use a unique phone number or log in.` } };
    }
  }

  const newUser = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    mobileNumber: mobileNumber ? mobileNumber.trim() : (cleanEmail ? `+9198000${Math.floor(10000 + Math.random() * 90000)}` : ''),
    phone: mobileNumber ? mobileNumber.trim() : (cleanEmail ? `+9198000${Math.floor(10000 + Math.random() * 90000)}` : ''),
    password: hashPassword(password),
    role: role || 'EMPLOYEE',
    organizationId: org._id,
    department: department || 'Engineering',
    wallet: 500,
    savedPlaces: [],
    emailVerified: true,
    phoneVerified: true,
    status: 'ACTIVE'
  });

  await Wallet.create({ userId: newUser._id, balance: 500 });

  const token = generateToken({
    _id: newUser._id.toString(),
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    organizationId: org._id.toString()
  });

  return {
    status: 201,
    data: {
      user: {
        _id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        role: newUser.role,
        organizationId: org._id.toString(),
        department: newUser.department,
        savedPlaces: [],
        walletBalance: 500
      },
      token
    }
  };
};

const getMe = async (user) => {
  if (!isDBConnected()) {
    return { 
      status: 503, 
      data: { error: 'MongoDB connection pending. Check your Atlas IP whitelist.' } 
    };
  }

  if (!user) {
    return { status: 401, data: { error: 'Unauthorized' } };
  }

  const dbUser = await User.findById(user._id).populate('organizationId');
  if (!dbUser) {
    return { status: 404, data: { error: 'User not found' } };
  }

  const wallet = await Wallet.findOne({ userId: dbUser._id });

  return {
    status: 200,
    data: {
      user: {
        _id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        mobileNumber: dbUser.mobileNumber,
        role: dbUser.role,
        organizationId: dbUser.organizationId ? dbUser.organizationId._id.toString() : null,
        organizationName: dbUser.organizationId ? dbUser.organizationId.name : '',
        department: dbUser.department,
        savedPlaces: dbUser.savedPlaces,
        walletBalance: wallet ? wallet.balance : 0
      },
      walletBalance: wallet ? wallet.balance : 0
    }
  };
};

module.exports = { login, sendOtp, verifyOtpAndRegister, register, getMe };

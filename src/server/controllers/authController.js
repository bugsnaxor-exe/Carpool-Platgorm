const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const Wallet = require('../../../models/Wallet');
const AuditLog = require('../../../models/AuditLog');
const { hashPassword, verifyPassword, generateToken } = require('../utils/security');

const { isDBConnected } = require('../config/db');

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
    return { status: 401, data: { error: 'Invalid credentials' } };
  }

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
    details: `User ${user.email} logged in`,
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

const register = async (body) => {
  const { name, email, mobileNumber, password, companyCode, department } = body;

  if (!name || !email || !password || !companyCode) {
    return { status: 400, data: { error: 'All fields including company code are required' } };
  }

  const org = await Organization.findOne({ code: String(companyCode).trim().toUpperCase() });
  if (!org) {
    return { status: 400, data: { error: 'Invalid Company Code' } };
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.trim().toLowerCase() }, { mobileNumber: mobileNumber ? mobileNumber.trim() : '' }]
  });

  if (existingUser) {
    return { status: 400, data: { error: 'User with this email or phone already exists' } };
  }

  const newUser = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    mobileNumber: mobileNumber ? mobileNumber.trim() : '',
    password: hashPassword(password),
    role: 'EMPLOYEE',
    organizationId: org._id,
    department: department || 'Engineering',
    savedPlaces: []
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

module.exports = { login, register, getMe };

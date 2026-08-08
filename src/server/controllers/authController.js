const db = require('../config/db');
const { hashPassword, verifyPassword, generateToken } = require('../utils/security');

// Dual Email / Mobile Login
const login = (reqData) => {
  const { identifier, password } = reqData;
  if (!identifier || !password) {
    return { status: 400, data: { error: 'Provide Email/Mobile and Password' } };
  }

  const normalized = identifier.trim().toLowerCase();
  const foundUser = db.users.find(u =>
    (u.email && u.email.toLowerCase() === normalized) ||
    (u.mobileNumber && u.mobileNumber.trim() === identifier.trim())
  );

  if (!foundUser || !verifyPassword(password, foundUser.password)) {
    return { status: 401, data: { error: 'Invalid Email/Mobile or Password' } };
  }

  const token = generateToken({
    userId: foundUser._id,
    name: foundUser.name,
    role: foundUser.role,
    organizationId: foundUser.organizationId
  });

  const { password: _, ...userWithoutPassword } = foundUser;
  return { status: 200, data: { message: 'Login successful', token, user: userWithoutPassword } };
};

// Registration
const register = (reqData) => {
  const { name, email, mobileNumber, password, role, department } = reqData;
  if (!name || (!email && !mobileNumber) || !password) {
    return { status: 400, data: { error: 'Name, Email/Mobile, and Password required' } };
  }

  const newUser = {
    _id: 'user_' + Date.now(),
    name,
    email: email ? email.toLowerCase() : null,
    mobileNumber: mobileNumber || null,
    password: hashPassword(password),
    role: role === 'COMPANY_ADMIN' ? 'COMPANY_ADMIN' : 'EMPLOYEE',
    organizationId: 'org_1',
    department: department || 'General',
    savedPlaces: [
      { label: 'Home', address: 'Bangalore City', lat: 12.9716, lng: 77.5946 },
      { label: 'Office', address: 'Acme Campus', lat: 12.8452, lng: 77.6602 }
    ],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  db.wallets[newUser._id] = 500;

  const token = generateToken({
    userId: newUser._id,
    name: newUser.name,
    role: newUser.role,
    organizationId: newUser.organizationId
  });

  const { password: _, ...userWithoutPassword } = newUser;
  return { status: 201, data: { message: 'Registration successful', token, user: userWithoutPassword } };
};

// Current Profile
const getMe = (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const profile = db.users.find(u => u._id === user.userId);
  if (!profile) return { status: 404, data: { error: 'User not found' } };
  const { password: _, ...userWithoutPassword } = profile;
  return { status: 200, data: { user: userWithoutPassword, walletBalance: db.wallets[user.userId] || 0 } };
};

module.exports = {
  login,
  register,
  getMe
};

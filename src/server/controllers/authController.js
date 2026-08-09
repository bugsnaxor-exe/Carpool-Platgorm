const User = require('../../../models/User');
const Organization = require('../../../models/Organization');
const Wallet = require('../../../models/Wallet');
const AuditLog = require('../../../models/AuditLog');
const { hashPassword, verifyPassword, generateToken } = require('../utils/security');
const { isDBConnected } = require('../config/db');
const { catchAsync } = require('../utils/errorHandler');

// In-Memory OTP / Reset Store (email -> { otp, expiresAt })
const otpStore = new Map();

const login = catchAsync(async (body) => {
  try {
    if (!isDBConnected()) {
      return { 
        status: 503, 
        data: { error: 'MongoDB Atlas connection pending. Ensure your IP address is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0).' } 
      };
    }

    const { identifier, email, password } = body;
    const rawId = identifier || email;

    if (!rawId || !password) {
      return { status: 400, data: { error: 'Corporate email and password are required' } };
    }

    const cleanId = String(rawId).trim().toLowerCase();
    const digitsOnly = String(rawId).replace(/\D/g, '');

    const user = await User.findOne({
      $or: [
        { email: cleanId },
        { phone: rawId },
        { mobileNumber: rawId },
        { mobileNumber: `+${digitsOnly}` },
        { mobileNumber: digitsOnly }
      ]
    }).populate('organizationId');

    let isPasswordValid = false;

    if (user && user.password) {
      isPasswordValid = verifyPassword(password, user.password);
      if (!isPasswordValid && typeof user.matchPassword === 'function') {
        try {
          isPasswordValid = await user.matchPassword(password);
        } catch (e) {}
      }
    }

    if (!user || !isPasswordValid) {
      if (user) {
        await User.updateOne({ _id: user._id }, { $inc: { failedLoginAttempts: 1 } });
      }
      return { status: 401, data: { error: 'Invalid credentials. Please check your corporate email and password.' } };
    }

    await User.updateOne({ _id: user._id }, {
      $set: {
        lastLoginAt: new Date(),
        lastLoginIp: '127.0.0.1',
        loginDevice: 'Web Browser Shell',
        failedLoginAttempts: 0
      },
      $inc: { loginCount: 1 }
    });

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
        message: 'Login successful',
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone || user.mobileNumber,
          mobileNumber: user.mobileNumber || user.phone,
          role: user.role,
          organizationId: user.organizationId ? user.organizationId._id.toString() : null,
          department: user.department,
          savedPlaces: user.savedPlaces,
          walletBalance: user.wallet || (wallet ? wallet.balance : 500)
        },
        token
      }
    };
  } catch (err) {
    console.error(`[Auth Login Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Authentication service error', details: err.message } };
  }
});

const sendOtp = catchAsync(async (body) => {
  try {
    if (!isDBConnected()) {
      return { status: 503, data: { error: 'MongoDB connection pending.' } };
    }

    const { email } = body;
    if (!email || !email.includes('@')) {
      return { status: 400, data: { error: 'A valid email address is required to receive verification OTP.' } };
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return { status: 400, data: { error: `An account with email "${cleanEmail}" already exists. Please sign in instead.` } };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(cleanEmail, { otp, expiresAt });

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
  } catch (err) {
    console.error(`[Auth Send OTP Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Could not dispatch OTP', details: err.message } };
  }
});

const verifyOtpAndRegister = catchAsync(async (body) => {
  try {
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

    otpStore.delete(cleanEmail);
    return await register(body);
  } catch (err) {
    console.error(`[Auth Verify OTP Error] ${err.message}`, err);
    return { status: 500, data: { error: 'OTP Verification process error', details: err.message } };
  }
});

const register = catchAsync(async (body) => {
  try {
    if (!isDBConnected()) {
      return { 
        status: 503, 
        data: { error: 'MongoDB connection pending. Check your Atlas IP whitelist.' } 
      };
    }

    const { name, email, mobileNumber, phone, password, companyCode, department, role } = body;
    const targetPhone = phone || mobileNumber;

    if (!name || (!email && !targetPhone) || !password) {
      return { status: 400, data: { error: 'Name, Password, and Email or Phone Number are required' } };
    }

    const targetCode = companyCode ? String(companyCode).trim().toUpperCase() : 'ACME';
    let org = await Organization.findOne({ code: targetCode });
    if (!org) {
      org = await Organization.findOne() || await Organization.create({ name: 'Acme Corporation', code: 'ACME' });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanMobile = targetPhone ? targetPhone.trim() : '';

    if (cleanEmail) {
      const existingByEmail = await User.findOne({ email: cleanEmail });
      if (existingByEmail) {
        return { status: 400, data: { error: `An account with email "${cleanEmail}" already exists. Please select the Login tab to log in.` } };
      }
    }

    if (cleanMobile) {
      const existingByMobile = await User.findOne({ 
        $or: [
          { mobileNumber: cleanMobile }, 
          { phone: cleanMobile },
          { mobileNumber: `+${cleanMobile.replace(/\D/g, '')}` }
        ] 
      });
      if (existingByMobile) {
        return { status: 400, data: { error: `An account with phone number "${cleanMobile}" already exists. Please log in.` } };
      }
    }

    const assignedPhone = cleanMobile || `+9198000${Math.floor(10000 + Math.random() * 90000)}`;

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      mobileNumber: assignedPhone,
      phone: assignedPhone,
      password,
      role: role || 'Employee',
      organizationId: org._id,
      department: department || 'Engineering',
      wallet: 500,
      walletBalance: 500,
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
        message: 'User registered successfully',
        user: {
          _id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
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
  } catch (err) {
    console.error(`[Auth Register Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Registration failed', details: err.message } };
  }
});

const forgotPassword = catchAsync(async (body) => {
  try {
    const { email } = body;
    if (!email) return { status: 400, data: { error: 'Email is required' } };
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return { status: 404, data: { error: 'No user registered with this email address' } };

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = resetOtp;
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    return { status: 200, data: { message: `Password reset OTP generated for ${cleanEmail}`, resetOtp } };
  } catch (err) {
    return { status: 500, data: { error: 'Forgot password process error', details: err.message } };
  }
});

const resetPassword = catchAsync(async (body) => {
  try {
    const { email, otp, newPassword } = body;
    if (!email || !newPassword) return { status: 400, data: { error: 'Email and new password are required' } };
    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) return { status: 404, data: { error: 'User not found' } };

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return { status: 200, data: { message: 'Password has been reset successfully' } };
  } catch (err) {
    return { status: 500, data: { error: 'Reset password process error', details: err.message } };
  }
});

const updateProfile = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const dbUser = await User.findById(user._id);
    if (!dbUser) return { status: 404, data: { error: 'User not found' } };

    const { name, phone, savedPlaces } = body;
    if (name) dbUser.name = name.trim();
    if (phone) {
      dbUser.phone = phone.trim();
      dbUser.mobileNumber = phone.trim();
    }
    if (savedPlaces) dbUser.savedPlaces = savedPlaces;

    await dbUser.save();
    return { status: 200, data: { message: 'Profile updated successfully', user: dbUser.toPublicJSON() } };
  } catch (err) {
    return { status: 500, data: { error: 'Update profile error', details: err.message } };
  }
});

const getMe = catchAsync(async (user) => {
  try {
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
          phone: dbUser.phone || dbUser.mobileNumber,
          mobileNumber: dbUser.mobileNumber || dbUser.phone,
          role: dbUser.role,
          organizationId: dbUser.organizationId ? dbUser.organizationId._id.toString() : null,
          organizationName: dbUser.organizationId ? dbUser.organizationId.name : '',
          department: dbUser.department,
          savedPlaces: dbUser.savedPlaces,
          walletBalance: dbUser.wallet || (wallet ? wallet.balance : 0)
        },
        walletBalance: dbUser.wallet || (wallet ? wallet.balance : 0)
      }
    };
  } catch (err) {
    console.error(`[Auth GetMe Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to retrieve profile', details: err.message } };
  }
});

module.exports = {
  login,
  loginWithEmail: login,
  registerUser: register,
  sendOtp,
  verifyOtpAndRegister,
  register,
  forgotPassword,
  resetPassword,
  updateProfile,
  getMe
};

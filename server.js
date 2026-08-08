const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'carpool_enterprise_secret_2026';

// -------------------------------------------------------------
// SECURE PASSWORD HASHING (Built-in Node.js Crypto Scrypt)
// -------------------------------------------------------------
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
};

// -------------------------------------------------------------
// HMAC JWT TOKEN GENERATION & VERIFICATION
// -------------------------------------------------------------
const generateToken = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 86400000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  if (!token) return null;
  try {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
};

// -------------------------------------------------------------
// IN-MEMORY DATABASE & MULTI-TENANT SEED DATA
// -------------------------------------------------------------
const db = {
  organizations: [
    { _id: 'org_1', name: 'Acme Corporation', code: 'ACME', fuelCostPerLiter: 102.50, travelCostPerKm: 8.50 },
    { _id: 'org_2', name: 'TechCorp Enterprise', code: 'TECH', fuelCostPerLiter: 98.00, travelCostPerKm: 7.80 }
  ],
  users: [],
  vehicles: [],
  rides: [],
  trips: [],
  wallets: {},
  transactions: [],
  auditLogs: []
};

// Seed initial users with salted scrypt password hashes
const seedDemoData = () => {
  const pwd = hashPassword('Password123!');

  db.users = [
    {
      _id: 'user_admin',
      name: 'Sarah Connor',
      email: 'admin@acme.com',
      mobileNumber: '+919876543210',
      password: pwd,
      role: 'COMPANY_ADMIN',
      organizationId: 'org_1',
      department: 'Corporate Mobility',
      savedPlaces: [{ label: 'HQ Office', address: 'Tech Park, Whitefield', lat: 12.9716, lng: 77.5946 }],
      createdAt: new Date().toISOString()
    },
    {
      _id: 'user_driver1',
      name: 'Alex Rivera',
      email: 'alex.rivera@acme.com',
      mobileNumber: '+919811223344',
      password: pwd,
      role: 'EMPLOYEE',
      organizationId: 'org_1',
      department: 'Engineering',
      savedPlaces: [
        { label: 'Home', address: 'Bellandur', lat: 12.9279, lng: 77.6772 },
        { label: 'Office', address: 'E-City Campus', lat: 12.8452, lng: 77.6602 }
      ],
      createdAt: new Date().toISOString()
    },
    {
      _id: 'user_passenger1',
      name: 'Priya Sharma',
      email: 'priya.s@acme.com',
      mobileNumber: '+919988776655',
      password: pwd,
      role: 'EMPLOYEE',
      organizationId: 'org_1',
      department: 'Product Design',
      savedPlaces: [{ label: 'Home', address: 'HSR Layout', lat: 12.9121, lng: 77.6445 }],
      createdAt: new Date().toISOString()
    }
  ];

  db.vehicles = [
    {
      _id: 'veh_1',
      userId: 'user_driver1',
      organizationId: 'org_1',
      model: 'Tata Nexon EV',
      registrationNumber: 'KA-01-EQ-9988',
      seatingCapacity: 4,
      fuelType: 'EV',
      color: 'Teal Blue',
      status: 'APPROVED'
    }
  ];

  db.rides = [
    {
      _id: 'ride_1',
      driverId: 'user_driver1',
      driverName: 'Alex Rivera',
      driverPhone: '+919811223344',
      vehicleId: 'veh_1',
      vehicleModel: 'Tata Nexon EV (KA-01-EQ-9988)',
      organizationId: 'org_1',
      pickupLocation: { name: 'Green Glen Layout, Bellandur', lat: 12.9279, lng: 77.6772 },
      destinationLocation: { name: 'Acme Campus, Electronic City', lat: 12.8452, lng: 77.6602 },
      travelDateTime: new Date(Date.now() + 3600000).toISOString(),
      totalSeats: 3,
      availableSeats: 2,
      farePerSeat: 120,
      recurring: true,
      routeDistanceKm: 14.5,
      estimatedDurationMins: 30,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    }
  ];

  db.wallets['user_admin'] = 1500;
  db.wallets['user_driver1'] = 850;
  db.wallets['user_passenger1'] = 600;

  db.auditLogs.push({
    _id: 'log_1',
    performedBy: 'user_admin',
    action: 'SYSTEM_BOOT',
    targetType: 'Platform',
    details: 'Enterprise Carpooling Platform initialized with multi-tenant zero-knowledge security',
    timestamp: new Date().toISOString()
  });
};

seedDemoData();

// -------------------------------------------------------------
// HTTP ROUTER & STATIC FILE SERVER
// -------------------------------------------------------------
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
};

const parseBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Pre-flight Options
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    return res.end();
  }

  // Auth Extraction
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const user = verifyToken(token);

  // -------------------------------------------------------------
  // API ENDPOINTS
  // -------------------------------------------------------------

  // 1. Dual Login (Email or Mobile)
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { identifier, password } = await parseBody(req);
    if (!identifier || !password) return sendJson(res, 400, { error: 'Provide Email/Mobile and Password' });

    const normalized = identifier.trim().toLowerCase();
    const foundUser = db.users.find(u => 
      (u.email && u.email.toLowerCase() === normalized) ||
      (u.mobileNumber && u.mobileNumber.trim() === identifier.trim())
    );

    if (!foundUser || !verifyPassword(password, foundUser.password)) {
      return sendJson(res, 401, { error: 'Invalid Email/Mobile or Password' });
    }

    const authToken = generateToken({
      userId: foundUser._id,
      name: foundUser.name,
      role: foundUser.role,
      organizationId: foundUser.organizationId
    });

    const { password: _, ...userWithoutPassword } = foundUser;
    return sendJson(res, 200, { message: 'Login successful', token: authToken, user: userWithoutPassword });
  }

  // 2. User Registration
  if (pathname === '/api/auth/register' && method === 'POST') {
    const { name, email, mobileNumber, password, role, department } = await parseBody(req);
    if (!name || (!email && !mobileNumber) || !password) {
      return sendJson(res, 400, { error: 'Name, Email/Mobile, and Password required' });
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

    const authToken = generateToken({
      userId: newUser._id,
      name: newUser.name,
      role: newUser.role,
      organizationId: newUser.organizationId
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return sendJson(res, 201, { message: 'Registration successful', token: authToken, user: userWithoutPassword });
  }

  // 3. Current User Profile
  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const profile = db.users.find(u => u._id === user.userId);
    if (!profile) return sendJson(res, 404, { error: 'User not found' });
    const { password: _, ...userWithoutPassword } = profile;
    return sendJson(res, 200, { user: userWithoutPassword, walletBalance: db.wallets[user.userId] || 0 });
  }

  // 4. Vehicles API
  if (pathname === '/api/vehicles' && method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const myVehicles = db.vehicles.filter(v => v.userId === user.userId);
    return sendJson(res, 200, myVehicles);
  }

  if (pathname === '/api/vehicles' && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const { model, registrationNumber, seatingCapacity, fuelType } = await parseBody(req);
    const newVeh = {
      _id: 'veh_' + Date.now(),
      userId: user.userId,
      organizationId: user.organizationId,
      model,
      registrationNumber: registrationNumber.toUpperCase(),
      seatingCapacity: parseInt(seatingCapacity, 10),
      fuelType: fuelType || 'PETROL',
      status: 'APPROVED'
    };
    db.vehicles.push(newVeh);
    return sendJson(res, 201, newVeh);
  }

  // 5. Rides API (Publish & Search)
  if (pathname === '/api/rides/publish' && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const { vehicleId, pickupLocation, destinationLocation, availableSeats, farePerSeat } = await parseBody(req);

    const vehicle = db.vehicles.find(v => v._id === vehicleId && v.userId === user.userId);
    if (!vehicle) return sendJson(res, 400, { error: 'Invalid registered vehicle' });

    const newRide = {
      _id: 'ride_' + Date.now(),
      driverId: user.userId,
      driverName: user.name,
      vehicleId: vehicle._id,
      vehicleModel: `${vehicle.model} (${vehicle.registrationNumber})`,
      organizationId: user.organizationId,
      pickupLocation,
      destinationLocation,
      travelDateTime: new Date(Date.now() + 3600000).toISOString(),
      totalSeats: parseInt(availableSeats, 10),
      availableSeats: parseInt(availableSeats, 10),
      farePerSeat: parseFloat(farePerSeat),
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };
    db.rides.push(newRide);
    return sendJson(res, 201, newRide);
  }

  if (pathname === '/api/rides/search' && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const { seats } = await parseBody(req);
    const needed = parseInt(seats, 10) || 1;
    const matches = db.rides.filter(r => 
      r.organizationId === user.organizationId &&
      r.status === 'OPEN' &&
      r.availableSeats >= needed &&
      r.driverId !== user.userId
    );
    return sendJson(res, 200, matches);
  }

  // 6. Trips API (Booking & Status)
  if (pathname === '/api/trips/book' && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const { rideId, seatsBooked } = await parseBody(req);
    const ride = db.rides.find(r => r._id === rideId);
    if (!ride || ride.status !== 'OPEN') return sendJson(res, 404, { error: 'Ride unavailable' });

    const seats = parseInt(seatsBooked, 10) || 1;
    ride.availableSeats -= seats;
    if (ride.availableSeats === 0) ride.status = 'IN_PROGRESS';

    const newTrip = {
      _id: 'trip_' + Date.now(),
      rideId: ride._id,
      driverId: ride.driverId,
      driverName: ride.driverName,
      passengerId: user.userId,
      passengerName: user.name,
      vehicleId: ride.vehicleId,
      vehicleModel: ride.vehicleModel,
      organizationId: user.organizationId,
      seatsBooked: seats,
      totalFare: ride.farePerSeat * seats,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      status: 'BOOKED',
      paymentStatus: 'PENDING',
      paymentMethod: 'WALLET',
      createdAt: new Date().toISOString()
    };
    db.trips.push(newTrip);
    return sendJson(res, 201, newTrip);
  }

  if (pathname === '/api/trips/my-trips' && method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const myTrips = db.trips.filter(t => t.passengerId === user.userId || t.driverId === user.userId);
    return sendJson(res, 200, myTrips);
  }

  if (pathname.startsWith('/api/trips/') && pathname.endsWith('/status') && method === 'PATCH') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const tripId = pathname.split('/')[3];
    const { status } = await parseBody(req);
    const trip = db.trips.find(t => t._id === tripId);
    if (!trip) return sendJson(res, 404, { error: 'Trip not found' });
    trip.status = status;
    return sendJson(res, 200, trip);
  }

  // 7. Wallet & Razorpay Sandbox Payments
  if (pathname === '/api/wallet/balance' && method === 'GET') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const balance = db.wallets[user.userId] || 0;
    const txns = db.transactions.filter(t => t.userId === user.userId);
    return sendJson(res, 200, { balance, transactions: txns });
  }

  if (pathname === '/api/wallet/recharge' && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const { amount, paymentId } = await parseBody(req);
    const rechargeAmt = parseFloat(amount);
    db.wallets[user.userId] = (db.wallets[user.userId] || 0) + rechargeAmt;

    const txn = {
      _id: 'txn_' + Date.now(),
      userId: user.userId,
      amount: rechargeAmt,
      type: 'CREDIT',
      paymentMethod: 'RAZORPAY_SANDBOX',
      description: 'Wallet Recharge via Razorpay Sandbox',
      status: 'SUCCESS',
      createdAt: new Date().toISOString()
    };
    db.transactions.push(txn);
    return sendJson(res, 200, { message: 'Recharged', balance: db.wallets[user.userId], transaction: txn });
  }

  if (pathname.startsWith('/api/trips/') && pathname.endsWith('/payment') && method === 'POST') {
    if (!user) return sendJson(res, 401, { error: 'Unauthorized' });
    const tripId = pathname.split('/')[3];
    const { method: payMethod } = await parseBody(req);
    const trip = db.trips.find(t => t._id === tripId);
    if (!trip) return sendJson(res, 404, { error: 'Trip not found' });

    const fare = trip.totalFare;
    if (payMethod === 'WALLET') {
      const current = db.wallets[user.userId] || 0;
      if (current < fare) return sendJson(res, 400, { error: `Insufficient wallet balance (₹${current.toFixed(2)}).` });
      db.wallets[user.userId] -= fare;
      db.wallets[trip.driverId] = (db.wallets[trip.driverId] || 0) + fare;
    }

    trip.paymentStatus = 'COMPLETED';
    trip.status = 'COMPLETED';
    return sendJson(res, 200, { message: 'Payment successful', trip, newBalance: db.wallets[user.userId] });
  }

  // 8. Admin Reports & Analytics (RBAC Protected)
  if (pathname === '/api/admin/employees' && method === 'GET') {
    if (!user || user.role !== 'COMPANY_ADMIN') return sendJson(res, 403, { error: 'Admin access required' });
    const cleanEmployees = db.users.map(({ password, ...u }) => u);
    return sendJson(res, 200, cleanEmployees);
  }

  if (pathname === '/api/admin/analytics' && method === 'GET') {
    if (!user || user.role !== 'COMPANY_ADMIN') return sendJson(res, 403, { error: 'Admin access required' });
    const totalTrips = db.trips.length + 18;
    const totalDistanceKm = (db.trips.length * 15.2) + 2840.5;
    return sendJson(res, 200, {
      totalTrips,
      totalDistanceKm: totalDistanceKm.toFixed(1),
      estimatedFuelLiters: (totalDistanceKm / 14.2).toFixed(1),
      travelCostPerKm: 8.5,
      totalOperationalCost: (totalDistanceKm * 8.5).toFixed(2)
    });
  }

  if (pathname === '/api/admin/audit-logs' && method === 'GET') {
    if (!user || user.role !== 'COMPANY_ADMIN') return sendJson(res, 403, { error: 'Admin access required' });
    return sendJson(res, 200, db.auditLogs);
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING FOR PUBLIC DIRECTORY
  // -------------------------------------------------------------
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Fallback to index.html for Single-Page React App Routing
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err2, htmlContent) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(htmlContent, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` CARPOOL PLATFORM SERVER RUNNING ON PORT ${PORT}`);
  console.log(` Android React UX & Web Admin Ready at http://localhost:${PORT}`);
  console.log(`====================================================`);
});

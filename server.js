require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { connectDB } = require('./src/server/config/db');
const { verifyToken } = require('./src/server/utils/security');
const authController = require('./src/server/controllers/authController');
const vehicleController = require('./src/server/controllers/vehicleController');
const rideController = require('./src/server/controllers/rideController');
const tripController = require('./src/server/controllers/tripController');
const walletController = require('./src/server/controllers/walletController');
const adminController = require('./src/server/controllers/adminController');

const PORT = process.env.PORT || 3000;

// Initialize Database Connection
connectDB();

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

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    return res.end();
  }

  if (pathname === '/api/config/maps-key') {
    return sendJson(res, 200, { key: process.env.GOOGLE_MAPS_API_KEY || '' });
  }

  if (pathname === '/maps-loader.js') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const scriptContent = `
      (function() {
        try {
          if (window.google && window.google.maps) return;
          var script = document.createElement('script');
          script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places';
          script.async = true;
          script.onerror = function() {
            console.warn("Google Maps script failed to load. Platform will use Leaflet map fallback.");
          };
          document.head.appendChild(script);
        } catch(e) {
          console.warn("Google Maps loader exception:", e);
        }
      })();
    `;
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return res.end(scriptContent);
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const user = verifyToken(token);

  try {
    // Modular Async Mongoose Controller Routing & Fail-Safe Route Aliases
    if ((pathname === '/api/auth/login' || pathname === '/api/login') && method === 'POST') {
      const result = await authController.login(await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if ((pathname === '/api/auth/send-otp' || pathname === '/api/request-otp') && method === 'POST') {
      const result = await authController.sendOtp(await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/auth/verify-otp-register' && method === 'POST') {
      const result = await authController.verifyOtpAndRegister(await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if ((pathname === '/api/auth/register' || pathname === '/api/register') && method === 'POST') {
      const result = await authController.register(await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const result = await authController.getMe(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/vehicles' && method === 'GET') {
      const result = await vehicleController.getVehicles(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/vehicles' && method === 'POST') {
      const result = await vehicleController.createVehicle(user, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/rides/publish' && method === 'POST') {
      const result = await rideController.publishRide(user, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/rides/search' && method === 'POST') {
      const result = await rideController.searchRides(user, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/trips/book' && method === 'POST') {
      const result = await tripController.bookTrip(user, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/trips/my-trips' && method === 'GET') {
      const result = await tripController.getMyTrips(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname.startsWith('/api/trips/') && pathname.endsWith('/status') && method === 'PATCH') {
      const tripId = pathname.split('/')[3];
      const result = await tripController.updateTripStatus(user, tripId, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname.startsWith('/api/trips/') && pathname.endsWith('/sos') && method === 'POST') {
      const tripId = pathname.split('/')[3];
      const result = await tripController.triggerSOS(user, tripId, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname.startsWith('/api/trips/') && pathname.endsWith('/receipt') && method === 'GET') {
      const tripId = pathname.split('/')[3];
      const result = await tripController.getReceipt(user, tripId);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/wallet/balance' && method === 'GET') {
      const result = await walletController.getWallet(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/wallet/recharge' && method === 'POST') {
      const result = await walletController.rechargeWallet(user, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname.startsWith('/api/trips/') && pathname.endsWith('/payment') && method === 'POST') {
      const tripId = pathname.split('/')[3];
      const result = await walletController.payTrip(user, tripId, await parseBody(req));
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/admin/employees' && method === 'GET') {
      const result = await adminController.getEmployees(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/admin/analytics' && method === 'GET') {
      const result = await adminController.getAnalytics(user);
      return sendJson(res, result.status, result.data);
    }

    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
      const result = await adminController.getAuditLogs(user);
      return sendJson(res, result.status, result.data);
    }
  } catch (err) {
    console.error(`[Server Error] Route Execution Failed: ${err.message}`, err);
    return sendJson(res, 500, { error: 'Internal Server Error', details: err.message });
  }

  // Static File Serving
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
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
  console.log(` MONGODB-POWERED CARPOOL PLATFORM RUNNING ON PORT ${PORT}`);
  console.log(` Endpoints: Auth, Rides, Trips, SOS, Wallet, Receipts, Admin`);
  console.log(` Ready at http://localhost:${PORT}`);
  console.log(`====================================================`);
});

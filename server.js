const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { verifyToken } = require('./src/server/utils/security');
const authController = require('./src/server/controllers/authController');
const vehicleController = require('./src/server/controllers/vehicleController');
const rideController = require('./src/server/controllers/rideController');
const tripController = require('./src/server/controllers/tripController');
const walletController = require('./src/server/controllers/walletController');
const adminController = require('./src/server/controllers/adminController');

const PORT = process.env.PORT || 3000;

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

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    });
    return res.end();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const user = verifyToken(token);

  // Modular Controller Routing
  if (pathname === '/api/auth/login' && method === 'POST') {
    const result = authController.login(await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/auth/register' && method === 'POST') {
    const result = authController.register(await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const result = authController.getMe(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/vehicles' && method === 'GET') {
    const result = vehicleController.getVehicles(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/vehicles' && method === 'POST') {
    const result = vehicleController.createVehicle(user, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/rides/publish' && method === 'POST') {
    const result = rideController.publishRide(user, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/rides/search' && method === 'POST') {
    const result = rideController.searchRides(user, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/trips/book' && method === 'POST') {
    const result = tripController.bookTrip(user, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/trips/my-trips' && method === 'GET') {
    const result = tripController.getMyTrips(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname.startsWith('/api/trips/') && pathname.endsWith('/status') && method === 'PATCH') {
    const tripId = pathname.split('/')[3];
    const result = tripController.updateTripStatus(user, tripId, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/wallet/balance' && method === 'GET') {
    const result = walletController.getWallet(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/wallet/recharge' && method === 'POST') {
    const result = walletController.rechargeWallet(user, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname.startsWith('/api/trips/') && pathname.endsWith('/payment') && method === 'POST') {
    const tripId = pathname.split('/')[3];
    const result = walletController.payTrip(user, tripId, await parseBody(req));
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/admin/employees' && method === 'GET') {
    const result = adminController.getEmployees(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/admin/analytics' && method === 'GET') {
    const result = adminController.getAnalytics(user);
    return sendJson(res, result.status, result.data);
  }

  if (pathname === '/api/admin/audit-logs' && method === 'GET') {
    const result = adminController.getAuditLogs(user);
    return sendJson(res, result.status, result.data);
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
  console.log(` MODULAR CARPOOL PLATFORM RUNNING ON PORT ${PORT}`);
  console.log(` Modular Architecture: Security, Auth, Ride, Trip, Wallet, Admin`);
  console.log(` Ready at http://localhost:${PORT}`);
  console.log(`====================================================`);
});

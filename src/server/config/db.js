const { hashPassword } = require('../utils/security');

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

const seedDatabase = () => {
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
    details: 'Modular Enterprise Carpooling Platform booted cleanly',
    timestamp: new Date().toISOString()
  });
};

seedDatabase();

module.exports = db;

const db = require('../config/db');

const getWallet = (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const balance = db.wallets[user.userId] || 0;
  const txns = db.transactions.filter(t => t.userId === user.userId);
  return { status: 200, data: { balance, transactions: txns } };
};

const rechargeWallet = (user, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { amount } = reqData;
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
  return { status: 200, data: { message: 'Recharged', balance: db.wallets[user.userId], transaction: txn } };
};

const payTrip = (user, tripId, reqData) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { method: payMethod } = reqData;
  const trip = db.trips.find(t => t._id === tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  const fare = trip.totalFare;
  if (payMethod === 'WALLET') {
    const current = db.wallets[user.userId] || 0;
    if (current < fare) return { status: 400, data: { error: `Insufficient wallet balance (₹${current.toFixed(2)}).` } };
    db.wallets[user.userId] -= fare;
    db.wallets[trip.driverId] = (db.wallets[trip.driverId] || 0) + fare;
  }

  trip.paymentStatus = 'COMPLETED';
  trip.status = 'COMPLETED';
  return { status: 200, data: { message: 'Payment successful', trip, newBalance: db.wallets[user.userId] } };
};

module.exports = {
  getWallet,
  rechargeWallet,
  payTrip
};

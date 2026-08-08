const Wallet = require('../../../models/Wallet');
const Transaction = require('../../../models/Transaction');
const Trip = require('../../../models/Trip');

const getWallet = async (user) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balance: 500 });
  }

  const history = await Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);

  return {
    status: 200,
    data: {
      balance: wallet.balance,
      history
    }
  };
};

const rechargeWallet = async (user, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };
  const { amount } = body;

  if (!amount || amount <= 0) {
    return { status: 400, data: { error: 'Invalid recharge amount' } };
  }

  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ userId: user._id, balance: 0 });
  }

  wallet.balance += Number(amount);
  await wallet.save();

  const transaction = await Transaction.create({
    userId: user._id,
    amount: Number(amount),
    type: 'RECHARGE',
    paymentMethod: 'RAZORPAY_UPI_SANDBOX',
    referenceId: `PAY-${Date.now()}`,
    status: 'SUCCESS'
  });

  return {
    status: 200,
    data: {
      newBalance: wallet.balance,
      transaction
    }
  };
};

const payTrip = async (user, tripId, body) => {
  if (!user) return { status: 401, data: { error: 'Unauthorized' } };

  const trip = await Trip.findById(tripId);
  if (!trip) return { status: 404, data: { error: 'Trip not found' } };

  let wallet = await Wallet.findOne({ userId: user._id });
  if (!wallet || wallet.balance < trip.totalFare) {
    return { status: 400, data: { error: 'Insufficient wallet balance' } };
  }

  wallet.balance -= trip.totalFare;
  await wallet.save();

  trip.paymentStatus = 'PAID';
  await trip.save();

  const transaction = await Transaction.create({
    userId: user._id,
    amount: trip.totalFare,
    type: 'TRIP_PAYMENT',
    paymentMethod: 'CORPORATE_WALLET',
    referenceId: `TRIP-PAY-${trip._id}`,
    status: 'SUCCESS'
  });

  return {
    status: 200,
    data: {
      message: 'Payment completed successfully',
      newBalance: wallet.balance,
      transaction
    }
  };
};

module.exports = { getWallet, rechargeWallet, payTrip };

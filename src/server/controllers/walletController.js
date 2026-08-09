const Wallet = require('../../../models/Wallet');
const User = require('../../../models/User');
const Trip = require('../../../models/Trip');
const Transaction = require('../../../models/Transaction');
const { catchAsync } = require('../utils/errorHandler');

const getWalletDetails = catchAsync(async (user) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const dbUser = await User.findById(user._id);
    let wallet = await Wallet.findOne({ userId: user._id });

    if (!wallet) {
      wallet = await Wallet.create({ userId: user._id, balance: 1250 });
    }

    const currentBalance = dbUser ? (dbUser.wallet !== undefined ? dbUser.wallet : (dbUser.walletBalance !== undefined ? dbUser.walletBalance : wallet.balance)) : wallet.balance;
    const ledger = await Transaction.find({ userId: user._id }).populate({ path: 'tripId', select: 'pickupLocation destination status' }).sort({ createdAt: -1 }).limit(20);

    return {
      status: 200,
      data: {
        balance: currentBalance,
        walletBalance: currentBalance,
        ledger,
        transactions: ledger
      }
    };
  } catch (err) {
    console.error(`[Get Wallet Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Failed to fetch wallet details', details: err.message } };
  }
});

const rechargeWallet = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const { amount, paymentMethod = 'UPI', gatewayTransactionId } = body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return { status: 400, data: { error: 'A valid recharge amount is required' } };
    }

    const dbUser = await User.findById(user._id);
    let wallet = await Wallet.findOne({ userId: user._id });

    if (!wallet) {
      wallet = await Wallet.create({ userId: user._id, balance: 500 });
    }

    wallet.balance += numAmount;
    await wallet.save();

    if (dbUser) {
      dbUser.wallet = (dbUser.wallet || 0) + numAmount;
      dbUser.walletBalance = dbUser.wallet;
      await dbUser.save();
    }

    const transaction = await Transaction.create({
      userId: user._id,
      transactionType: 'Credit',
      amount: numAmount,
      description: `Wallet Recharge via ${paymentMethod}`,
      paymentMethod,
      gatewayTransactionId
    });

    return {
      status: 200,
      data: {
        message: 'Wallet recharged successfully',
        newBalance: dbUser ? dbUser.wallet : wallet.balance,
        balance: dbUser ? dbUser.wallet : wallet.balance,
        transaction
      }
    };
  } catch (err) {
    console.error(`[Recharge Wallet Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Wallet recharge failed', details: err.message } };
  }
});

const payForTrip = catchAsync(async (user, body) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };

    const { tripId } = body;
    if (!tripId) return { status: 400, data: { error: 'tripId is required' } };

    const trip = await Trip.findById(tripId);
    if (!trip) return { status: 404, data: { error: 'Trip not found' } };

    if (trip.passengerId.toString() !== user._id.toString()) {
      return { status: 403, data: { error: 'You are not authorized to pay for this trip' } };
    }

    if (trip.paymentStatus === 'Completed' || trip.paymentStatus === 'PAID') {
      return { status: 400, data: { error: 'Trip is already paid for' } };
    }

    const fare = Number(trip.fareDetails || trip.totalFare);
    const passenger = await User.findById(user._id);
    const driver = await User.findById(trip.driverId);

    const passengerWallet = (passenger && passenger.wallet !== undefined) ? passenger.wallet : 0;
    if (passengerWallet < fare) {
      return { status: 400, data: { error: 'Insufficient wallet balance. Please recharge.' } };
    }

    if (passenger) {
      passenger.wallet -= fare;
      passenger.walletBalance = passenger.wallet;
      await passenger.save();
    }

    if (driver) {
      driver.wallet = (driver.wallet || 0) + fare;
      driver.walletBalance = driver.wallet;
      await driver.save();
    }

    await Transaction.create([
      {
        userId: user._id,
        transactionType: 'Debit',
        amount: fare,
        description: 'Payment for Trip',
        tripId: trip._id,
        paymentMethod: 'Internal Wallet Transfer'
      },
      {
        userId: trip.driverId,
        transactionType: 'Credit',
        amount: fare,
        description: 'Earnings from Trip',
        tripId: trip._id,
        paymentMethod: 'Internal Wallet Transfer'
      }
    ]);

    trip.paymentStatus = 'Completed';
    trip.paymentMethod = 'Wallet';
    await trip.save();

    return {
      status: 200,
      data: {
        message: 'Payment successful',
        passengerBalance: passenger ? passenger.wallet : 0,
        balance: passenger ? passenger.wallet : 0,
        trip
      }
    };
  } catch (err) {
    console.error(`[Pay Trip Error] ${err.message}`, err);
    return { status: 500, data: { error: 'Trip payment transaction failed', details: err.message } };
  }
});

const getTransactionHistory = catchAsync(async (user, queryParams = {}) => {
  try {
    if (!user) return { status: 401, data: { error: 'Unauthorized' } };
    const { type } = queryParams;

    const filter = { userId: user._id };
    if (type) filter.transactionType = type;

    const history = await Transaction.find(filter)
      .populate({ path: 'tripId', select: 'pickupLocation destination status' })
      .sort({ createdAt: -1 });

    return { status: 200, data: { results: history, history } };
  } catch (err) {
    return { status: 500, data: { error: 'Failed to retrieve transaction history', details: err.message } };
  }
});

module.exports = {
  getWallet: getWalletDetails,
  getWalletDetails,
  rechargeWallet,
  payTrip: payForTrip,
  payForTrip,
  getTransactionHistory
};

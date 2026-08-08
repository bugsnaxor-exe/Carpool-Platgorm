const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['RECHARGE', 'TRIP_PAYMENT', 'REFUND', 'EARNING'], required: true },
  paymentMethod: { type: String, default: 'RAZORPAY_UPI_SANDBOX' },
  referenceId: { type: String },
  status: { type: String, enum: ['SUCCESS', 'PENDING', 'FAILED'], default: 'SUCCESS' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);

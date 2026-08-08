const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionType: { type: String, enum: ['Credit', 'Debit', 'CREDIT', 'DEBIT'], required: true },
    amount: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip' },
    paymentMethod: { 
      type: String, 
      enum: ['Razorpay', 'Cash', 'Card', 'UPI', 'Internal Wallet Transfer', 'Wallet'], 
      default: 'UPI',
      required: true 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);

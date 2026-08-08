const { useState, useEffect } = React;

function WalletView({ token, walletBalance, setWalletBalance }) {
  const [rechargeAmount, setRechargeAmount] = useState(500);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [upiId, setUpiId] = useState('employee@okaxis');
  const [processing, setProcessing] = useState(false);

  const handleOpenRazorpay = (amt) => {
    setRechargeAmount(amt);
    setShowRazorpayModal(true);
  };

  const handleSimulatePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: rechargeAmount, paymentMethod: 'RAZORPAY_UPI' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setWalletBalance(data.newBalance);
      setShowRazorpayModal(false);
      alert(`Success! ₹${rechargeAmount} added to your Carpool Wallet.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>Carpool Wallet</h3>

      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #10b981' }}>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Available Balance</div>
        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981', margin: '6px 0 16px 0' }}>
          ₹{walletBalance.toFixed(2)}
        </div>

        <div style={{ fontSize: '0.82rem', fontWeight: '700', marginBottom: '8px' }}>Quick Recharge Amount</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[100, 200, 500, 1000].map(amt => (
            <button key={amt} onClick={() => handleOpenRazorpay(amt)} style={{ flex: 1, padding: '8px', background: '#334155', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>
              +₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Razorpay UPI Sandbox Payment Modal Overlay */}
      {showRazorpayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%', background: '#0f172a', border: '1px solid #3b82f6', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: '#3b82f6', fontSize: '1.2rem' }}></i>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: '#fff' }}>Razorpay Sandbox</span>
              </div>
              <button onClick={() => setShowRazorpayModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', marginBottom: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Recharge Amount</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#3b82f6' }}>₹{rechargeAmount}</div>
            </div>

            <div className="input-group">
              <label className="input-label">UPI ID / VPA</label>
              <input type="text" className="input-field" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </div>

            <button onClick={handleSimulatePayment} className="btn btn-secondary" disabled={processing}>
              {processing ? 'Authorizing Payment Gateway...' : `Authorize ₹${rechargeAmount} Payment`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.WalletView = WalletView;

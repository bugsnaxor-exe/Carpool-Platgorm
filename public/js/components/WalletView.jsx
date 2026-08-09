const { useState, useEffect } = React;

function WalletView({ token, walletBalance, setWalletBalance }) {
  const [rechargeAmount, setRechargeAmount] = useState(500);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [upiId, setUpiId] = useState('employee@okaxis');
  const [processing, setProcessing] = useState(false);
  const [msg, setMsg] = useState('');

  const handleOpenRazorpay = (amt) => {
    setRechargeAmount(amt);
    setShowRazorpayModal(true);
  };

  const handleSimulatePayment = async () => {
    setProcessing(true);
    setMsg('');
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
      if (!res.ok) throw new Error(data.error || 'Recharge failed');

      setWalletBalance(data.newBalance || data.balance);
      setShowRazorpayModal(false);
      setMsg(`✅ Success! ₹${rechargeAmount} added to your Carpool Wallet.`);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="view-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>Carpool Wallet</h3>
          <p style={{ fontSize: '0.8rem', color: '#5D7063' }}>Manage funds and auto-pay shared commute fares</p>
        </div>
        <div className="badge badge-emerald">
          <i className="fa-solid fa-wallet"></i> Active
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(13, 110, 66, 0.1)', color: '#0D6E42', border: '1px solid rgba(13, 110, 66, 0.25)', fontSize: '0.82rem', fontWeight: '700', marginBottom: '14px' }}>
          {msg}
        </div>
      )}

      {/* Premium Emerald Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #053B22, #074E2E)', color: '#FFFFFF', border: 'none', boxShadow: '0 12px 35px rgba(5, 59, 34, 0.28)', padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '0.78rem', color: '#A3E635', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <i className="fa-solid fa-shield-halved"></i> Corporate Commute Wallet
          </div>
          <i className="fa-solid fa-wifi" style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '1rem' }}></i>
        </div>

        <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#FFFFFF', margin: '4px 0 18px 0', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.5px' }}>
          ₹{Number(walletBalance || 0).toFixed(2)}
        </div>

        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#FFFFFF', opacity: 0.9, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Quick Recharge Options
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[100, 200, 500, 1000].map(amt => (
            <button key={amt} onClick={() => handleOpenRazorpay(amt)} style={{ flex: 1, padding: '10px 4px', background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)', color: '#FFFFFF', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', fontSize: '0.82rem', backdropFilter: 'blur(4px)', transition: 'all 0.2s ease' }}>
              +₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Razorpay UPI Sandbox Payment Modal Overlay */}
      {showRazorpayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5, 59, 34, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', animation: 'fadeSlideIn 0.25s ease forwards' }}>
          <div className="card" style={{ maxWidth: '360px', width: '100%', background: '#FFFFFF', border: '1px solid #E8E1D3', borderRadius: '22px', boxShadow: '0 25px 60px rgba(5, 59, 34, 0.3)', padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: '#0D6E42', fontSize: '1.3rem' }}></i>
                <span style={{ fontWeight: '800', fontSize: '1.05rem', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>Razorpay Sandbox</span>
              </div>
              <button onClick={() => setShowRazorpayModal(false)} style={{ background: 'none', border: 'none', color: '#5D7063', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '14px', background: '#F4EFE6', borderRadius: '14px', marginBottom: '16px', textAlign: 'center', border: '1px solid #E8E1D3' }}>
              <div style={{ fontSize: '0.78rem', color: '#5D7063', fontWeight: '700', textTransform: 'uppercase' }}>Recharge Amount</div>
              <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0D6E42', fontFamily: 'Outfit, sans-serif' }}>₹{rechargeAmount}</div>
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-qrcode" style={{ color: '#0D6E42' }}></i> UPI ID / VPA</label>
              <input type="text" className="input-field" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </div>

            <button onClick={handleSimulatePayment} className="btn" disabled={processing} style={{ marginTop: '8px' }}>
              {processing ? 'Authorizing Payment...' : `Authorize ₹${rechargeAmount} Payment`} <i className="fa-solid fa-lock"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

window.WalletView = WalletView;

const { useState, useEffect, useRef } = React;

function LiveTrackingView({ trip, token, onBack, walletBalance, setWalletBalance }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);

  const [speed, setSpeed] = useState(42);
  const [etaMinutes, setEtaMinutes] = useState(18);
  const [distanceKm, setDistanceKm] = useState(5.4);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'driver', text: 'Hi! I am at Bellandur main signal. Reaching in 3 mins.', time: '9:30 AM' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const [paymentDone, setPaymentDone] = useState(trip.paymentStatus === 'COMPLETED');
  const [paying, setPaying] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [sosActive, setSosActive] = useState(false);

  // Initialize Live Animated Route Tracking Map
  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([12.9121, 77.6445], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      // Route Coordinates
      const routeCoords = [
        [12.9279, 77.6772], // Pickup Bellandur
        [12.9121, 77.6445], // Waypoint Silkboard
        [12.8452, 77.6602]  // Destination E-City
      ];

      L.polyline(routeCoords, { color: '#3b82f6', weight: 5 }).addTo(mapInstance.current);
      L.marker(routeCoords[0]).addTo(mapInstance.current).bindPopup('Pickup');
      L.marker(routeCoords[2]).addTo(mapInstance.current).bindPopup('Destination');

      // Driver Moving Marker
      const carIcon = L.divIcon({
        className: 'custom-car-icon',
        html: '<div style="background:#10b981; border:2px solid #fff; width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; box-shadow:0 0 10px rgba(16,185,129,0.8);"><i class="fa-solid fa-car"></i></div>',
        iconSize: [28, 28]
      });

      driverMarker.current = L.marker(routeCoords[0], { icon: carIcon }).addTo(mapInstance.current);
    }

    // Driver Movement Simulation & Telemetry Update
    const interval = setInterval(() => {
      setSpeed(Math.floor(35 + Math.random() * 20));
      setDistanceKm(prev => {
        const next = prev - 0.1;
        return next > 0.5 ? parseFloat(next.toFixed(1)) : 0.5;
      });
      setEtaMinutes(prev => (prev > 1 ? prev - 1 : 1));

      if (driverMarker.current) {
        const currentLatLng = driverMarker.current.getLatLng();
        driverMarker.current.setLatLng([currentLatLng.lat - 0.0008, currentLatLng.lng - 0.0004]);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([...messages, { sender: 'me', text: inputMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setInputMsg('');
  };

  const handleTriggerSOS = async () => {
    if (!confirm('EMERGENCY ALERT: Are you sure you want to trigger SOS? Corporate security will be immediately notified with your GPS coordinates.')) return;
    try {
      const res = await fetch(`/api/trips/${trip._id}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lat: 12.9279, lng: 77.6772 })
      });
      const data = await res.json();
      setSosActive(true);
      alert(data.message);
    } catch (err) {
      alert('Failed to trigger SOS alert');
    }
  };

  const handleFetchReceipt = async () => {
    try {
      const res = await fetch(`/api/trips/${trip._id}/receipt`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReceiptData(data);
    } catch (err) {
      alert('Error fetching receipt');
    }
  };

  const handlePayTrip = async () => {
    setPaying(true);
    try {
      const res = await fetch(`/api/trips/${trip._id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ method: 'WALLET' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPaymentDone(true);
      setWalletBalance(data.newBalance);
      alert('Payment completed via Wallet balance!');
    } catch (err) {
      alert(err.message);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: '700' }}>
          <i className="fa-solid fa-arrow-left"></i> Back to Trips
        </button>
        <span className="badge badge-emerald"><i className="fa-solid fa-circle-dot"></i> Live Tracking</span>
      </div>

      {/* Interactive OpenStreetMap */}
      <div className="map-view-container" ref={mapRef} style={{ height: '240px' }}></div>

      {/* Telemetry Dashboard */}
      <div className="telemetry-bar">
        <div>
          <div className="telemetry-val" style={{ color: '#10b981' }}>{speed} km/h</div>
          <div className="telemetry-lbl">Speed</div>
        </div>
        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
          <div className="telemetry-val" style={{ color: '#3b82f6' }}>{etaMinutes} min</div>
          <div className="telemetry-lbl">ETA Remaining</div>
        </div>
        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
          <div className="telemetry-val" style={{ color: '#8b5cf6' }}>{distanceKm} km</div>
          <div className="telemetry-lbl">Distance Left</div>
        </div>
      </div>

      {/* Driver Info Card */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar-circle">{trip.driverName ? trip.driverName.charAt(0) : 'D'}</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{trip.driverName}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{trip.vehicleModel}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setChatOpen(!chatOpen)} style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#10b981', borderRadius: '8px', cursor: 'pointer' }}>
              <i className="fa-solid fa-comment"></i>
            </button>
            <button onClick={handleTriggerSOS} style={{ padding: '8px 12px', background: sosActive ? '#ef4444' : 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
              <i className="fa-solid fa-triangle-exclamation"></i> SOS
            </button>
          </div>
        </div>
      </div>

      {/* Floating In-Trip Chat Drawer */}
      {chatOpen && (
        <div className="card" style={{ marginTop: '12px', background: '#0f172a', border: '1px solid #334155' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '8px', color: '#10b981' }}>In-Trip Messenger</div>
          <div style={{ maxHeight: '120px', overflowY: 'auto', marginBottom: '8px' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ textAlign: m.sender === 'me' ? 'right' : 'left', marginBottom: '6px' }}>
                <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: '12px', background: m.sender === 'me' ? '#10b981' : '#1e293b', color: '#fff', fontSize: '0.8rem' }}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '6px' }}>
            <input type="text" className="input-field" style={{ padding: '6px', fontSize: '0.8rem' }} placeholder="Type message..." value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} />
            <button type="submit" style={{ padding: '6px 12px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Send</button>
          </form>
        </div>
      )}

      {/* Payment Action Bar */}
      <div className="card" style={{ marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Total Fare Amount</div>
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>₹{trip.totalFare}</div>
          </div>
          <span className={`badge ${paymentDone ? 'badge-emerald' : 'badge-blue'}`}>
            {paymentDone ? 'PAID VIA WALLET' : 'UNPAID'}
          </span>
        </div>

        {!paymentDone ? (
          <button onClick={handlePayTrip} className="btn" disabled={paying}>
            {paying ? 'Processing Wallet Debit...' : `Pay ₹${trip.totalFare} via Wallet`} <i className="fa-solid fa-credit-card"></i>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, padding: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}>
              <i className="fa-solid fa-circle-check"></i> Payment Settlement Completed
            </div>
            <button onClick={handleFetchReceipt} style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}>
              <i className="fa-solid fa-file-invoice"></i> Receipt
            </button>
          </div>
        )}
      </div>

      {/* Receipt Modal Overlay */}
      {receiptData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ maxWidth: '340px', width: '100%', background: '#0f172a', border: '1px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>Corporate Travel Receipt</h4>
              <button onClick={() => setReceiptData(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              <div><strong>Receipt #:</strong> {receiptData.receiptNumber}</div>
              <div><strong>Date:</strong> {receiptData.issueDate}</div>
              <div><strong>Passenger:</strong> {receiptData.passengerName}</div>
              <div><strong>Driver:</strong> {receiptData.driverName}</div>
              <div><strong>Vehicle:</strong> {receiptData.vehicle}</div>
              <div><strong>Total Paid:</strong> <strong style={{ color: '#10b981' }}>{receiptData.fareAmount}</strong></div>
              <div><strong>CO₂ Saved:</strong> <span style={{ color: '#10b981' }}>{receiptData.co2Saved}</span></div>
            </div>
            <button onClick={() => setReceiptData(null)} className="btn" style={{ marginTop: '14px', padding: '8px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.LiveTrackingView = LiveTrackingView;

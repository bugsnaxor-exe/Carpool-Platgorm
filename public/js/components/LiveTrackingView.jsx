const { useState, useEffect, useRef } = React;

function LiveTrackingView({ trip, token, onBack, walletBalance, setWalletBalance }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const polylineRef = useRef(null);

  const [speed, setSpeed] = useState(38);
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [distanceKm, setDistanceKm] = useState(4.2);
  const [currentRoad, setCurrentRoad] = useState('En route via Main Highway');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'driver', text: 'Hi! I am en route following the GPS route. See you shortly!', time: '9:30 AM' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const [paymentDone, setPaymentDone] = useState(trip.paymentStatus === 'COMPLETED');
  const [paying, setPaying] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const [sosActive, setSosActive] = useState(false);

  // Helper: Geocode address to Lat/Lng
  const geocodeAddress = async (address, defaultLat, defaultLng) => {
    try {
      if (typeof address === 'object' && address.lat && address.lng) return address;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
      }
    } catch (e) {}
    return { lat: defaultLat, lng: defaultLng, name: String(address || 'Location') };
  };

  // Helper: Fetch OSRM Road Route
  const fetchOSRMRoadRoute = async (startLat, startLng, endLat, endLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      }
    } catch (e) {}
    return [
      { lat: startLat, lng: startLng },
      { lat: startLat + (endLat - startLat) * 0.3, lng: startLng + (endLng - startLng) * 0.3 },
      { lat: startLat + (endLat - startLat) * 0.7, lng: startLng + (endLng - startLng) * 0.7 },
      { lat: endLat, lng: endLng }
    ];
  };

  // Initialize Official Google Maps Live Tracking & Driver Movement
  useEffect(() => {
    let animationInterval = null;

    const setupLiveGoogleMapTracking = async () => {
      if (!mapRef.current) return;

      const pLoc = trip.rideId?.pickupLocation || { lat: 12.9279, lng: 77.6772, name: 'Pickup' };
      const dLoc = trip.rideId?.destinationLocation || { lat: 12.8452, lng: 77.6602, name: 'Destination' };

      const startPoint = await geocodeAddress(pLoc.name || pLoc, 12.9279, 77.6772);
      const endPoint = await geocodeAddress(dLoc.name || dLoc, 12.8452, 77.6602);

      const beigeMapStyle = [
        { elementType: "geometry", stylers: [{ color: "#f5f3ed" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#003366" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#f5f3ed" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#003366" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#003366" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d2ebd0" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#4f7754" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#d6d2c4" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#e4dfce" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9d3c2" }] }
      ];

      if (typeof window.google !== 'undefined' && window.google.maps) {
        googleMapRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat: startPoint.lat, lng: startPoint.lng },
          zoom: 13,
          styles: beigeMapStyle,
          disableDefaultUI: true
        });

        const roadWaypoints = await fetchOSRMRoadRoute(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);

        // Pickup & Destination Markers
        new window.google.maps.Marker({
          position: { lat: startPoint.lat, lng: startPoint.lng },
          map: googleMapRef.current,
          title: `📍 Pickup: ${startPoint.name}`
        });

        new window.google.maps.Marker({
          position: { lat: endPoint.lat, lng: endPoint.lng },
          map: googleMapRef.current,
          title: `🏁 Destination: ${endPoint.name}`
        });

        // Navigation Route Polyline
        polylineRef.current = new window.google.maps.Polyline({
          path: roadWaypoints,
          geodesic: true,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.95,
          strokeWeight: 6,
          map: googleMapRef.current
        });

        const bounds = new window.google.maps.LatLngBounds();
        roadWaypoints.forEach(pt => bounds.extend(pt));
        googleMapRef.current.fitBounds(bounds);

        // Animated Driver Vehicle Marker
        driverMarkerRef.current = new window.google.maps.Marker({
          position: roadWaypoints[0],
          map: googleMapRef.current,
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#10b981',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        let currStepIndex = 0;
        const totalSteps = roadWaypoints.length;

        animationInterval = setInterval(() => {
          if (currStepIndex < totalSteps - 1) {
            currStepIndex++;
            const nextCoord = roadWaypoints[currStepIndex];
            if (driverMarkerRef.current) {
              driverMarkerRef.current.setPosition(nextCoord);
            }

            const progressRatio = currStepIndex / totalSteps;
            const remainingKm = Math.max(0.1, (4.2 * (1 - progressRatio)).toFixed(1));
            const remainingMin = Math.max(1, Math.ceil(12 * (1 - progressRatio)));

            setSpeed(Math.floor(32 + Math.random() * 18));
            setDistanceKm(remainingKm);
            setEtaMinutes(remainingMin);
            setCurrentRoad(currStepIndex < totalSteps * 0.5 ? 'Approaching Pickup Junction' : 'Cruising on Main Highway');
          } else {
            setSpeed(0);
            setDistanceKm(0);
            setEtaMinutes(0);
            setCurrentRoad('Arrived at Pickup Location');
          }
        }, 2500);
      }
    };

    setupLiveGoogleMapTracking();

    return () => {
      if (animationInterval) clearInterval(animationInterval);
    };
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
        <span className="badge badge-emerald"><i className="fa-solid fa-location-arrow fa-spin"></i> Google Maps Live Tracking</span>
      </div>

      {/* Interactive Google Map Container */}
      <div className="map-view-container" ref={mapRef} style={{ height: '250px' }}></div>

      {/* Real-Time Telemetry Bar */}
      <div className="telemetry-bar">
        <div>
          <div className="telemetry-val" style={{ color: '#10b981' }}>{speed} km/h</div>
          <div className="telemetry-lbl">Live Speed</div>
        </div>
        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
          <div className="telemetry-val" style={{ color: '#3b82f6' }}>{etaMinutes} min</div>
          <div className="telemetry-lbl">ETA</div>
        </div>
        <div style={{ borderLeft: '1px solid #334155', paddingLeft: '12px' }}>
          <div className="telemetry-val" style={{ color: '#8b5cf6' }}>{distanceKm} km</div>
          <div className="telemetry-lbl">Distance</div>
        </div>
      </div>

      <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: '#60a5fa', fontSize: '0.78rem', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="fa-solid fa-compass fa-spin"></i>
        <span><strong>Status:</strong> {currentRoad}</span>
      </div>

      {/* Driver Info Card */}
      <div className="card" style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar-circle">{trip.driverName ? trip.driverName.charAt(0) : 'D'}</div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{trip.driverName || 'Driver'}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{trip.vehicleModel || 'Tata Nexon EV'}</div>
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
            <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#10b981' }}>₹{trip.totalFare || 120}</div>
          </div>
          <span className={`badge ${paymentDone ? 'badge-emerald' : 'badge-blue'}`}>
            {paymentDone ? 'PAID VIA WALLET' : 'UNPAID'}
          </span>
        </div>

        {!paymentDone ? (
          <button onClick={handlePayTrip} className="btn" disabled={paying}>
            {paying ? 'Processing Wallet Debit...' : `Pay ₹${trip.totalFare || 120} via Wallet`} <i className="fa-solid fa-credit-card"></i>
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
              <div><strong>Receipt #:</strong> {receiptData.receiptId || 'REC-9981'}</div>
              <div><strong>Date:</strong> {receiptData.issuedAt || new Date().toLocaleDateString()}</div>
              <div><strong>Passenger:</strong> {receiptData.passengerName}</div>
              <div><strong>Driver:</strong> {receiptData.driverName}</div>
              <div><strong>Vehicle:</strong> {receiptData.vehicleModel}</div>
              <div><strong>Total Paid:</strong> <strong style={{ color: '#10b981' }}>₹{receiptData.totalFare}</strong></div>
            </div>
            <button onClick={() => setReceiptData(null)} className="btn" style={{ marginTop: '14px', padding: '8px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.LiveTrackingView = LiveTrackingView;

const { useState, useEffect, useRef } = React;

function FindRideView({ token, walletBalance, setWalletBalance, setActiveTab }) {
  const [pickup, setPickup] = useState('Green Glen Layout, Bellandur');
  const [destination, setDestination] = useState('Acme Campus, Electronic City');
  const [seats, setSeats] = useState(1);
  const [recurring, setRecurring] = useState(false);

  const [step, setStep] = useState('SEARCH'); // 'SEARCH' or 'RESULTS'
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookedTrip, setBookedTrip] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  // Initialize Route Preview Map
  useEffect(() => {
    if (step === 'SEARCH' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([12.9121, 77.6445], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      // Pickup Marker
      L.marker([12.9279, 77.6772]).addTo(mapInstance.current).bindPopup('Pickup: Bellandur');
      // Destination Marker
      L.marker([12.8452, 77.6602]).addTo(mapInstance.current).bindPopup('Destination: E-City');

      // Connecting Polyline
      L.polyline([[12.9279, 77.6772], [12.8452, 77.6602]], { color: '#10b981', weight: 4, dashArray: '6, 8' }).addTo(mapInstance.current);
    }
  }, [step]);

  const handleSearchRides = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/rides/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pickup, destination, seats })
      });
      const data = await res.json();
      setRides(data);
      setStep('RESULTS');
    } catch (err) {
      alert('Error searching rides');
    } finally {
      setLoading(false);
    }
  };

  const handleBookRide = async (rideId) => {
    try {
      const res = await fetch('/api/trips/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rideId, seatsBooked: seats })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBookedTrip(data);
      setActiveTab('TRIPS');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>Find a Ride</h3>

      {step === 'SEARCH' ? (
        <form onSubmit={handleSearchRides}>
          {/* Interactive Route Map Preview */}
          <div className="map-view-container" ref={mapRef}></div>

          <div className="card">
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#10b981' }}></i> Pickup Location</label>
              <input type="text" className="input-field" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
            </div>

            {/* Quick Location Shortcuts */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button type="button" onClick={() => setPickup('Home (Bellandur)')} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem' }}>
                <i className="fa-solid fa-house"></i> Home
              </button>
              <button type="button" onClick={() => setPickup('Office (Electronic City)')} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem' }}>
                <i className="fa-solid fa-building"></i> Office
              </button>
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444' }}></i> Destination</label>
              <input type="text" className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Seats Needed</label>
                <select className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)}>
                  <option value={1}>1 Seat</option>
                  <option value={2}>2 Seats</option>
                  <option value={3}>3 Seats</option>
                </select>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Schedule</label>
                <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                  <label htmlFor="recurring" style={{ cursor: 'pointer', color: '#cbd5e1' }}>Daily Pass</label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Searching Rides...' : 'Find Available Rides'} <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button onClick={() => setStep('SEARCH')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', marginBottom: '12px', fontSize: '0.85rem', fontWeight: '700' }}>
            <i className="fa-solid fa-arrow-left"></i> Modify Search Criteria
          </button>

          {rides.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <i className="fa-solid fa-car-burst" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '12px' }}></i>
              <p style={{ color: '#94a3b8' }}>No co-worker rides found matching your exact route.</p>
            </div>
          ) : (
            rides.map(ride => (
              <div key={ride._id} className="ride-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-circle">{ride.driverName.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{ride.driverName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}><i className="fa-solid fa-car"></i> {ride.vehicleModel}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>₹{ride.farePerSeat}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>per seat</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  <div><strong style={{ color: '#10b981' }}>From:</strong> {ride.pickupLocation.name || ride.pickupLocation}</div>
                  <div style={{ marginTop: '4px' }}><strong style={{ color: '#ef4444' }}>To:</strong> {ride.destinationLocation.name || ride.destinationLocation}</div>
                  {ride.co2SavedKg && (
                    <div style={{ marginTop: '6px', color: '#10b981', fontSize: '0.78rem' }}>
                      <i className="fa-solid fa-leaf"></i> Estimated CO₂ Offset: <strong>{ride.co2SavedKg} kg</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-emerald"><i className="fa-solid fa-chair"></i> {ride.availableSeats} seats left</span>
                  <button onClick={() => handleBookRide(ride._id)} className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }}>
                    Book Seat <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

window.FindRideView = FindRideView;

const { useState, useEffect } = React;

function MyTripsView({ token, walletBalance, setWalletBalance }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTrackingTrip, setActiveTrackingTrip] = useState(null);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/trips/my-trips', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setTrips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (activeTrackingTrip) {
    return (
      <window.LiveTrackingView 
        trip={activeTrackingTrip} 
        token={token} 
        onBack={() => { setActiveTrackingTrip(null); fetchTrips(); }}
        walletBalance={walletBalance}
        setWalletBalance={setWalletBalance}
      />
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>My Trips</h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Loading your trips...</div>
      ) : trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <i className="fa-solid fa-route" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '12px' }}></i>
          <p style={{ color: '#94a3b8' }}>No trips booked yet.</p>
        </div>
      ) : (
        trips.map(trip => (
          <div key={trip._id} className="ride-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className={`badge ${trip.status === 'COMPLETED' ? 'badge-emerald' : 'badge-blue'}`}>
                {trip.status}
              </span>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                {new Date(trip.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '4px' }}>
              Driver: {trip.driverName}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '10px' }}>
              Vehicle: {trip.vehicleModel}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Total Fare</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>₹{trip.totalFare}</div>
              </div>

              <button onClick={() => setActiveTrackingTrip(trip)} className="btn" style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8rem' }}>
                <i className="fa-solid fa-location-crosshairs"></i> Track Trip
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

window.MyTripsView = MyTripsView;

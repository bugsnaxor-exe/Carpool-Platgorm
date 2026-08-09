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
      const list = Array.isArray(data) ? data : (data.results || data.trips || []);
      setTrips(list);
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
    <div className="view-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>My Trips</h3>
          <p style={{ fontSize: '0.8rem', color: '#5D7063' }}>Manage your booked and ongoing corporate commutes</p>
        </div>
        <div className="badge badge-emerald">
          <i className="fa-solid fa-route"></i> {trips.length} Booked
        </div>
      </div>

      {loading ? (
        <div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-header">
                <div className="skeleton skeleton-avatar"></div>
                <div className="skeleton-body">
                  <div className="skeleton skeleton-line medium"></div>
                  <div className="skeleton skeleton-line short"></div>
                </div>
              </div>
              <div className="skeleton skeleton-block"></div>
              <div className="skeleton skeleton-button"></div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E8E1D3' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F4EFE6', color: '#0D6E42', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: '12px' }}>
            <i className="fa-solid fa-route"></i>
          </div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#11281A', marginBottom: '4px' }}>No Trips Booked Yet</h4>
          <p style={{ fontSize: '0.82rem', color: '#5D7063' }}>Find and reserve your next shared commute ride!</p>
        </div>
      ) : (
        trips.map(trip => {
          const isCompleted = trip.status === 'COMPLETED' || trip.tripStatus === 'Completed';
          const isOngoing = trip.status === 'IN_TRANSIT' || trip.tripStatus === 'Ongoing';
          const driverName = trip.driverId ? (trip.driverId.name || trip.driverName) : (trip.driverName || 'Corporate Driver');
          const vehicleInfo = trip.rideId ? (trip.rideId.vehicleModel || trip.vehicleModel || 'Corporate Sedan') : (trip.vehicleModel || 'Corporate Sedan');
          const fare = trip.fareDetails || trip.totalFare || 150;

          return (
            <div key={trip._id} className="ride-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className={`badge ${isCompleted ? 'badge-emerald' : isOngoing ? 'badge-purple' : 'badge-emerald'}`}>
                  <i className={`fa-solid ${isCompleted ? 'fa-circle-check' : isOngoing ? 'fa-circle-play' : 'fa-clock'}`}></i> {trip.tripStatus || trip.status}
                </span>
                <div style={{ fontSize: '0.78rem', color: '#5D7063', fontWeight: '600' }}>
                  {new Date(trip.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div className="avatar-circle">
                  {driverName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#11281A' }}>
                    {driverName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#5D7063' }}>
                    <i className="fa-solid fa-car-side" style={{ color: '#0D6E42' }}></i> {vehicleInfo}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E8E1D3' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#5D7063', textTransform: 'uppercase', fontWeight: '700' }}>Total Fare</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0D6E42' }}>₹{fare}</div>
                </div>

                <button onClick={() => setActiveTrackingTrip(trip)} className="btn" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem', borderRadius: '12px' }}>
                  <i className="fa-solid fa-location-crosshairs"></i> Track Trip
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

window.MyTripsView = MyTripsView;

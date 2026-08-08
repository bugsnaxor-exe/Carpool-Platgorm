const { useState, useEffect, useRef } = React;

function FindRideView({ token, walletBalance, setWalletBalance, setActiveTab }) {
  const [pickup, setPickup] = useState('Green Glen Layout, Bellandur');
  const [destination, setDestination] = useState('Acme Campus, Electronic City');
  const [seats, setSeats] = useState(1);
  const [recurring, setRecurring] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);

  const [step, setStep] = useState('SEARCH'); // 'SEARCH' or 'RESULTS'
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookedTrip, setBookedTrip] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routePolylineRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // Helper: Geocode location string to Lat/Lng via Nominatim
  const geocodeAddress = async (address, defaultLat, defaultLng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name.split(',')[0] };
      }
    } catch (e) {}
    return { lat: defaultLat, lng: defaultLng, name: address };
  };

  // Helper: Fetch actual road geometry via OSRM Driving Router API
  const fetchOSRMRoadRoute = async (startLat, startLng, endLat, endLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        // Map GeoJSON [lng, lat] to Leaflet [lat, lng]
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
    } catch (e) {
      console.warn('OSRM Road Route failed, using fallback coordinates');
    }
    return [[startLat, startLng], [endLat, endLng]];
  };

  // Draw Real Road Route on Map
  const drawRoadRouteOnMap = async () => {
    if (!mapInstance.current) return;
    setRoutingLoading(true);

    const startLoc = await geocodeAddress(pickup, 12.9279, 77.6772);
    const endLoc = await geocodeAddress(destination, 12.8452, 77.6602);

    const roadWaypoints = await fetchOSRMRoadRoute(startLoc.lat, startLoc.lng, endLoc.lat, endLoc.lng);

    // Remove previous layers
    if (routePolylineRef.current) mapInstance.current.removeLayer(routePolylineRef.current);
    if (pickupMarkerRef.current) mapInstance.current.removeLayer(pickupMarkerRef.current);
    if (destMarkerRef.current) mapInstance.current.removeLayer(destMarkerRef.current);

    // Pickup Marker
    pickupMarkerRef.current = L.marker([startLoc.lat, startLoc.lng])
      .addTo(mapInstance.current)
      .bindPopup(`📍 Pickup: ${startLoc.name}`);

    // Destination Marker
    destMarkerRef.current = L.marker([endLoc.lat, endLoc.lng])
      .addTo(mapInstance.current)
      .bindPopup(`🏁 Destination: ${endLoc.name}`);

    // Draw Smooth Road Polyline following actual highways & streets
    routePolylineRef.current = L.polyline(roadWaypoints, {
      color: '#10b981',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapInstance.current);

    // Auto-fit camera bounds to display full route
    mapInstance.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [30, 30] });
    setRoutingLoading(false);
  };

  // Initialize Route Preview Map
  useEffect(() => {
    if (step === 'SEARCH' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([12.9121, 77.6445], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      drawRoadRouteOnMap();
    }
  }, [step]);

  // Actual Real-Time GPS Location Fetching
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setFetchingGPS(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse Geocoding via OpenStreetMap API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const placeName = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(',')
            : `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          setPickup(placeName);
          await drawRoadRouteOnMap();
        } catch (err) {
          setPickup(`Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setFetchingGPS(false);
        }
      },
      (error) => {
        setFetchingGPS(false);
        alert(`Could not fetch location: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
          <div style={{ position: 'relative' }}>
            <div className="map-view-container" ref={mapRef}></div>
            {routingLoading && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '12px', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', zIndex: 500 }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Calculating Road Navigation...
              </div>
            )}
          </div>

          <div className="card">
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#10b981' }}></i> Pickup Location</label>
              <input 
                type="text" 
                className="input-field" 
                value={pickup} 
                onChange={(e) => setPickup(e.target.value)} 
                onBlur={drawRoadRouteOnMap}
                required 
              />
            </div>

            {/* Location Shortcuts & Actual GPS Fetcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={fetchCurrentLocation} 
                disabled={fetchingGPS}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '16px', 
                  border: '1px solid #10b981', 
                  background: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981', 
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid ${fetchingGPS ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i> 
                {fetchingGPS ? 'Fetching GPS...' : 'Use Current GPS'}
              </button>

              <button type="button" onClick={async () => { setPickup('Bellandur, Bengaluru'); await drawRoadRouteOnMap(); }} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-house"></i> Home
              </button>
              
              <button type="button" onClick={async () => { setPickup('Electronic City, Bengaluru'); await drawRoadRouteOnMap(); }} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-building"></i> Office
              </button>
            </div>

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444' }}></i> Destination</label>
              <input 
                type="text" 
                className="input-field" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)} 
                onBlur={drawRoadRouteOnMap}
                required 
              />
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

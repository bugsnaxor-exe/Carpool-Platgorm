const { useState, useEffect, useRef } = React;

function FindRideView({ token, walletBalance, setWalletBalance, setActiveTab }) {
  // Exact Default Locations with verified Lat/Lng
  const DEFAULT_PICKUP = { lat: 12.9279, lng: 77.6772, name: 'Bellandur, Bengaluru' };
  const DEFAULT_DESTINATION = { lat: 12.8452, lng: 77.6602, name: 'Electronic City, Bengaluru' };

  const [pickup, setPickup] = useState(DEFAULT_PICKUP.name);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION.name);

  const pickupLocRef = useRef(DEFAULT_PICKUP);
  const destLocRef = useRef(DEFAULT_DESTINATION);

  const [seats, setSeats] = useState(1);
  const [recurring, setRecurring] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [fetchingDestGPS, setFetchingDestGPS] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);

  // Autocomplete Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [step, setStep] = useState('SEARCH'); // 'SEARCH' or 'RESULTS'
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bookedTrip, setBookedTrip] = useState(null);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routePolylineRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const pickupDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);

  // Helper: Deep Hyper-Local Location Search API with Multi-Tier Fallbacks
  const fetchLocationSuggestions = async (query, setSuggestions, setShowDropdown) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    try {
      const q = query.trim();
      // Tier 1: Localized Search with extratags, namedetails, and sub-locality coverage
      let url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&namedetails=1&limit=8&countrycodes=in&q=${encodeURIComponent(q)}`;
      let res = await fetch(url);
      let data = await res.json();

      // Tier 2: Appended Region Fallback if 0 results
      if (!data || data.length === 0) {
        url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q + ', India')}`;
        res = await fetch(url);
        data = await res.json();
      }

      // Tier 3: Global Unconstrained Search
      if (!data || data.length === 0) {
        url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(q)}`;
        res = await fetch(url);
        data = await res.json();
      }

      if (data && data.length > 0) {
        const formatted = data.map(item => {
          const parts = item.display_name.split(',');
          // Detailed sub-locality label (e.g., "Hridaypur, Barasat, North 24 Parganas")
          const label = parts.length > 3 ? parts.slice(0, 3).join(', ') : item.display_name;
          return {
            label: label,
            fullAddress: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
        setSuggestions(formatted);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (e) {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // Handle Pickup Typing Autocomplete
  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickup(val);

    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    pickupDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setPickupSuggestions, setShowPickupDropdown);
    }, 280);
  };

  // Handle Destination Typing Autocomplete
  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestination(val);

    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setDestSuggestions, setShowDestDropdown);
    }, 280);
  };

  // Helper: Fetch actual turn-by-turn road geometry via OSRM Driving Router API
  const fetchOSRMRoadRoute = async (startLat, startLng, endLat, endLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
    } catch (e) {
      console.warn('OSRM Road Route failed, using direct points');
    }
    return [[startLat, startLng], [endLat, endLng]];
  };

  // Draw Exact Road Route on Map using verified coordinates
  const drawRoadRouteOnMap = async (customStart, customEnd) => {
    const startLoc = customStart || pickupLocRef.current;
    const endLoc = customEnd || destLocRef.current;

    if (!startLoc || !endLoc || !mapInstance.current) return;
    setRoutingLoading(true);

    const roadWaypoints = await fetchOSRMRoadRoute(startLoc.lat, startLoc.lng, endLoc.lat, endLoc.lng);

    if (!mapInstance.current) return;

    // Remove previous markers & route layers
    if (routePolylineRef.current) mapInstance.current.removeLayer(routePolylineRef.current);
    if (pickupMarkerRef.current) mapInstance.current.removeLayer(pickupMarkerRef.current);
    if (destMarkerRef.current) mapInstance.current.removeLayer(destMarkerRef.current);

    // Exact Pickup Marker
    pickupMarkerRef.current = L.marker([startLoc.lat, startLoc.lng])
      .addTo(mapInstance.current)
      .bindPopup(`📍 Pickup: ${startLoc.name}`);

    // Exact Destination Marker
    destMarkerRef.current = L.marker([endLoc.lat, endLoc.lng])
      .addTo(mapInstance.current)
      .bindPopup(`🏁 Destination: ${endLoc.name}`);

    // Draw Smooth Road Navigation Polyline
    routePolylineRef.current = L.polyline(roadWaypoints, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(mapInstance.current);

    // Auto-fit camera bounds to fit both locations & road route
    mapInstance.current.fitBounds(routePolylineRef.current.getBounds(), { padding: [35, 35] });
    setRoutingLoading(false);
  };

  // Select Pickup Autocomplete Suggestion with exact Lat/Lng
  const selectPickupSuggestion = async (item) => {
    const newPickup = { lat: item.lat, lng: item.lng, name: item.label };
    setPickup(item.label);
    pickupLocRef.current = newPickup;
    setShowPickupDropdown(false);
    await drawRoadRouteOnMap(newPickup, null);
  };

  // Select Destination Autocomplete Suggestion with exact Lat/Lng
  const selectDestSuggestion = async (item) => {
    const newDest = { lat: item.lat, lng: item.lng, name: item.label };
    setDestination(item.label);
    destLocRef.current = newDest;
    setShowDestDropdown(false);
    await drawRoadRouteOnMap(null, newDest);
  };

  // Set Location from Preset Shortcuts
  const setPresetLocation = async (type, locObj) => {
    if (type === 'PICKUP') {
      setPickup(locObj.name);
      pickupLocRef.current = locObj;
      await drawRoadRouteOnMap(locObj, null);
    } else {
      setDestination(locObj.name);
      destLocRef.current = locObj;
      await drawRoadRouteOnMap(null, locObj);
    }
  };

  // Safe Leaflet Map Initialization & Re-mounting Fix + Map Click Location Selection
  useEffect(() => {
    if (step === 'SEARCH' && mapRef.current) {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      mapInstance.current = L.map(mapRef.current).setView([pickupLocRef.current.lat, pickupLocRef.current.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      // Interactive Map Click Location Selection
      mapInstance.current.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const placeName = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `Map Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

          const clickedLoc = { lat, lng, name: placeName };
          setDestination(placeName);
          destLocRef.current = clickedLoc;
          await drawRoadRouteOnMap(null, clickedLoc);
        } catch (err) {}
      });

      drawRoadRouteOnMap();
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [step]);

  // Actual Real-Time GPS Pickup Location Fetching
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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const placeName = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(',')
            : `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          const gpsLoc = { lat: latitude, lng: longitude, name: placeName };
          setPickup(placeName);
          pickupLocRef.current = gpsLoc;
          await drawRoadRouteOnMap(gpsLoc, null);
        } catch (err) {
          const fallbackGps = { lat: latitude, lng: longitude, name: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` };
          setPickup(fallbackGps.name);
          pickupLocRef.current = fallbackGps;
          await drawRoadRouteOnMap(fallbackGps, null);
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

  // Actual Real-Time GPS Destination Location Fetching
  const fetchDestinationLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setFetchingDestGPS(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const placeName = data.display_name
            ? data.display_name.split(',').slice(0, 3).join(',')
            : `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;

          const gpsLoc = { lat: latitude, lng: longitude, name: placeName };
          setDestination(placeName);
          destLocRef.current = gpsLoc;
          await drawRoadRouteOnMap(null, gpsLoc);
        } catch (err) {
          const fallbackGps = { lat: latitude, lng: longitude, name: `Destination GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` };
          setDestination(fallbackGps.name);
          destLocRef.current = fallbackGps;
          await drawRoadRouteOnMap(null, fallbackGps);
        } finally {
          setFetchingDestGPS(false);
        }
      },
      (error) => {
        setFetchingDestGPS(false);
        alert(`Could not fetch destination location: ${error.message}`);
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
            {routingLoading ? (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.85)', padding: '6px 12px', borderRadius: '12px', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', zIndex: 500 }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Calculating Road Navigation...
              </div>
            ) : (
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15, 23, 42, 0.85)', padding: '5px 10px', borderRadius: '12px', color: '#cbd5e1', fontSize: '0.72rem', fontWeight: '600', zIndex: 500 }}>
                <i className="fa-solid fa-hand-pointer" style={{ color: '#10b981' }}></i> Click map to drop pin
              </div>
            )}
          </div>

          <div className="card">
            {/* Pickup Location Field & Autocomplete Dropdown */}
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#10b981' }}></i> Pickup Location</label>
              <input 
                type="text" 
                className="input-field" 
                value={pickup} 
                onChange={handlePickupChange} 
                onFocus={() => pickupSuggestions.length > 0 && setShowPickupDropdown(true)}
                onBlur={() => setTimeout(() => setShowPickupDropdown(false), 250)}
                placeholder="Type any local area, landmark, or street..."
                required 
              />

              {showPickupDropdown && pickupSuggestions.length > 0 && (
                <ul className="autocomplete-dropdown">
                  {pickupSuggestions.map((item, idx) => (
                    <li 
                      key={idx} 
                      className="autocomplete-item"
                      onMouseDown={() => selectPickupSuggestion(item)}
                    >
                      <i className="fa-solid fa-location-dot" style={{ color: '#10b981' }}></i>
                      <div>
                        <div style={{ fontWeight: '600' }}>{item.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.fullAddress}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Pickup Location Shortcuts & GPS Fetcher */}
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

              <button type="button" onClick={() => setPresetLocation('PICKUP', { lat: 12.9279, lng: 77.6772, name: 'Bellandur, Bengaluru' })} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-house"></i> Home
              </button>
              
              <button type="button" onClick={() => setPresetLocation('PICKUP', { lat: 22.7214, lng: 88.4816, name: 'Barasat, Kolkata' })} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-location-dot"></i> Barasat
              </button>
            </div>

            {/* Destination Location Field & Autocomplete Dropdown */}
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444' }}></i> Destination Location</label>
              <input 
                type="text" 
                className="input-field" 
                value={destination} 
                onChange={handleDestinationChange} 
                onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
                onBlur={() => setTimeout(() => setShowDestDropdown(false), 250)}
                placeholder="Type destination area or landmark..."
                required 
              />

              {showDestDropdown && destSuggestions.length > 0 && (
                <ul className="autocomplete-dropdown">
                  {destSuggestions.map((item, idx) => (
                    <li 
                      key={idx} 
                      className="autocomplete-item"
                      onMouseDown={() => selectDestSuggestion(item)}
                    >
                      <i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444' }}></i>
                      <div>
                        <div style={{ fontWeight: '600' }}>{item.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{item.fullAddress}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Destination Location Shortcuts & GPS Fetcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={fetchDestinationLocation} 
                disabled={fetchingDestGPS}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '16px', 
                  border: '1px solid #ef4444', 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  color: '#f87171', 
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid ${fetchingDestGPS ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i> 
                {fetchingDestGPS ? 'Fetching Destination...' : 'Use Current GPS as Dest'}
              </button>

              <button type="button" onClick={() => setPresetLocation('DEST', { lat: 22.6547, lng: 88.4467, name: 'Kolkata Airport (CCU)' })} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-plane-departure"></i> Airport
              </button>

              <button type="button" onClick={() => setPresetLocation('DEST', { lat: 12.8452, lng: 77.6602, name: 'Electronic City, Bengaluru' })} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontSize: '0.78rem', cursor: 'pointer' }}>
                <i className="fa-solid fa-briefcase"></i> E-City HQ
              </button>
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

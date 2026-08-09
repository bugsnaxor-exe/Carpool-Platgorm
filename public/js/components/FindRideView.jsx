const { useState, useEffect, useRef } = React;

function FindRideView({ token, walletBalance, setWalletBalance, setActiveTab }) {
  // Default Locations
  const DEFAULT_PICKUP = { lat: 22.5726, lng: 88.4337, name: 'Salt Lake Sector V, Kolkata' };
  const DEFAULT_DESTINATION = { lat: 22.6547, lng: 88.4467, name: 'Kolkata Airport (CCU)' };

  const [pickup, setPickup] = useState(DEFAULT_PICKUP.name);
  const [destination, setDestination] = useState(DEFAULT_DESTINATION.name);

  const pickupLocRef = useRef(DEFAULT_PICKUP);
  const destLocRef = useRef(DEFAULT_DESTINATION);

  // Route Telemetry (Distance)
  const [routeInfo, setRouteInfo] = useState({ distanceKm: null });

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
  const [msg, setMsg] = useState('');

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const routePolylineRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const pickupDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);

  // Pre-configured Corporate Hotspot Locations for Instant Suggestions
  const HOTSPOT_LOCATIONS = [
    { label: 'Salt Lake Sector V', fullAddress: 'Salt Lake Sector V, Bidhannagar, Kolkata', lat: 22.5726, lng: 88.4337 },
    { label: 'Kolkata Airport (CCU)', fullAddress: 'Netaji Subhash Chandra Bose International Airport, Dum Dum, Kolkata', lat: 22.6547, lng: 88.4467 },
    { label: 'Barasat Junction', fullAddress: 'Barasat Champadali Bus Terminal, Barasat, Kolkata', lat: 22.7214, lng: 88.4816 },
    { label: 'New Town Eco Park', fullAddress: 'Action Area II, New Town, Kolkata', lat: 22.5973, lng: 88.4680 },
    { label: 'Electronic City HQ', fullAddress: 'Electronic City Phase 1, Bengaluru', lat: 12.8452, lng: 77.6602 },
    { label: 'Bellandur Campus', fullAddress: 'Outer Ring Road, Bellandur, Bengaluru', lat: 12.9279, lng: 77.6772 },
    { label: 'Howrah Railway Station', fullAddress: 'Howrah Railway Station, Howrah, Kolkata', lat: 22.5840, lng: 88.3426 },
    { label: 'Park Street', fullAddress: 'Park Street, Kolkata', lat: 22.5534, lng: 88.3524 }
  ];

  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Helper: Fetch matching location suggestions while typing
  const fetchLocationSuggestions = (query, setSuggestions, setShowDropdown) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const q = query.trim().toLowerCase();

    // 1. Instant Hotspot Matching
    const hotspotMatches = HOTSPOT_LOCATIONS.filter(h => 
      h.label.toLowerCase().includes(q) || h.fullAddress.toLowerCase().includes(q)
    );

    if (hotspotMatches.length > 0) {
      setSuggestions(hotspotMatches);
      setShowDropdown(true);
    }

    // 2. OpenStreetMap Nominatim Live Geocoding
    fetchNominatimFallback(query.trim(), hotspotMatches, setSuggestions, setShowDropdown);
  };

  const fetchNominatimFallback = async (q, existing, setSuggestions, setShowDropdown) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const formatted = data.map(item => {
          const parts = item.display_name.split(',');
          return {
            label: parts.length > 3 ? parts.slice(0, 3).join(', ') : item.display_name,
            fullAddress: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
          };
        });
        setSuggestions([...existing, ...formatted]);
        setShowDropdown(true);
      } else if (existing.length > 0) {
        setSuggestions(existing);
        setShowDropdown(true);
      }
    } catch (e) {
      if (existing.length > 0) {
        setSuggestions(existing);
        setShowDropdown(true);
      }
    }
  };

  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickup(val);
    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    pickupDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setPickupSuggestions, setShowPickupDropdown);
    }, 180);
  };

  const handleDestinationChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setDestSuggestions, setShowDestDropdown);
    }, 180);
  };

  const setPresetLocation = (type, locObj) => {
    if (type === 'PICKUP') {
      setPickup(locObj.name);
      pickupLocRef.current = locObj;
      drawRoadRouteOnMap(locObj, null);
    } else {
      setDestination(locObj.name);
      destLocRef.current = locObj;
      drawRoadRouteOnMap(null, locObj);
    }
  };

  const selectPickupSuggestion = (item) => {
    setPickup(item.label);
    setShowPickupDropdown(false);
    const locObj = { lat: item.lat || 22.5726, lng: item.lng || 88.4337, name: item.label };
    pickupLocRef.current = locObj;
    drawRoadRouteOnMap(locObj, null);
  };

  const selectDestSuggestion = (item) => {
    setDestination(item.label);
    setShowDestDropdown(false);
    const locObj = { lat: item.lat || 22.6547, lng: item.lng || 88.4467, name: item.label };
    destLocRef.current = locObj;
    drawRoadRouteOnMap(null, locObj);
  };

  // Fetch Turn-by-Turn Road Waypoints from OSRM
  const fetchOSRMRoadRoute = async (startLat, startLng, endLat, endLng) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = parseFloat((route.distance / 1000).toFixed(1));
        setRouteInfo({ distanceKm: distKm });
        return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      }
    } catch (e) {}

    const distKm = calculateHaversineDistance(startLat, startLng, endLat, endLng);
    setRouteInfo({ distanceKm: distKm });
    return [[startLat, startLng], [endLat, endLng]];
  };

  // Draw Road Line & Custom Pin Markers on Map Canvas
  const drawRoadRouteOnMap = async (customStart, customEnd) => {
    const startLoc = customStart || pickupLocRef.current;
    const endLoc = customEnd || destLocRef.current;
    if (!startLoc || !endLoc) return;
    setRoutingLoading(true);

    const waypoints = await fetchOSRMRoadRoute(startLoc.lat, startLoc.lng, endLoc.lat, endLoc.lng);

    if (mapInstance.current && typeof L !== 'undefined') {
      try {
        if (pickupMarkerRef.current) mapInstance.current.removeLayer(pickupMarkerRef.current);
        if (destMarkerRef.current) mapInstance.current.removeLayer(destMarkerRef.current);
        if (routePolylineRef.current) mapInstance.current.removeLayer(routePolylineRef.current);

        const greenIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #0D6E42; color: #FFF; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; border: 2.5px solid #FFF; box-shadow: 0 4px 14px rgba(0,0,0,0.3);"><i class="fa-solid fa-location-dot"></i></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const redIcon = L.divIcon({
          className: 'custom-map-pin',
          html: `<div style="background: #c0392b; color: #FFF; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; border: 2.5px solid #FFF; box-shadow: 0 4px 14px rgba(0,0,0,0.3);"><i class="fa-solid fa-flag-checkered"></i></div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        pickupMarkerRef.current = L.marker([startLoc.lat, startLoc.lng], { icon: greenIcon })
          .bindPopup(`<b>Pickup:</b> ${startLoc.name}`)
          .addTo(mapInstance.current);

        destMarkerRef.current = L.marker([endLoc.lat, endLoc.lng], { icon: redIcon })
          .bindPopup(`<b>Destination:</b> ${endLoc.name}`)
          .addTo(mapInstance.current);

        routePolylineRef.current = L.polyline(waypoints, {
          color: '#0D6E42',
          weight: 6,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        const bounds = L.latLngBounds(waypoints);
        mapInstance.current.fitBounds(bounds, { padding: [35, 35] });
      } catch (err) {
        console.error('[Map Draw Error]', err);
      }
    }
    setRoutingLoading(false);
  };

  useEffect(() => {
    if (step === 'SEARCH' && mapRef.current) {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }

      mapInstance.current = L.map(mapRef.current).setView([pickupLocRef.current.lat, pickupLocRef.current.lng], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance.current);

      drawRoadRouteOnMap();
    }
  }, [step]);

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const gpsLoc = { lat: latitude, lng: longitude, name: `GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` };
        setPickup(gpsLoc.name);
        pickupLocRef.current = gpsLoc;
        await drawRoadRouteOnMap(gpsLoc, null);
        setFetchingGPS(false);
      },
      () => setFetchingGPS(false)
    );
  };

  const fetchDestinationLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingDestGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const gpsLoc = { lat: latitude, lng: longitude, name: `Dest GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` };
        setDestination(gpsLoc.name);
        destLocRef.current = gpsLoc;
        await drawRoadRouteOnMap(null, gpsLoc);
        setFetchingDestGPS(false);
      },
      () => setFetchingDestGPS(false)
    );
  };

  const handleSearchRides = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/rides/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pickupName: pickup, destinationName: destination, seats })
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || data.rides || []);
      setRides(list);
      setStep('RESULTS');
    } catch (err) {
      setMsg('❌ Error searching rides');
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
        body: JSON.stringify({ rideId, seatsBooked: Number(seats), paymentMethod: 'UPI' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book trip');

      setBookedTrip(data.trip || data);
      if (setActiveTab) setActiveTab('TRIPS');
    } catch (err) {
      alert(`Booking Error: ${err.message}`);
    }
  };

  return (
    <div className="view-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>Find a Ride</h3>
          <p style={{ fontSize: '0.8rem', color: '#5D7063' }}>Search active shared commute routes</p>
        </div>
        <div className="badge badge-emerald">
          <i className="fa-solid fa-magnifying-glass"></i> Rider Mode
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(231, 76, 60, 0.1)', color: '#c0392b', border: '1px solid rgba(231, 76, 60, 0.25)', fontSize: '0.82rem', fontWeight: '700', marginBottom: '14px' }}>
          {msg}
        </div>
      )}

      {step === 'SEARCH' ? (
        <form onSubmit={handleSearchRides}>
          {/* Interactive Turn-by-Turn Road Route Map */}
          <div style={{ position: 'relative' }}>
            <div className="map-view-container" ref={mapRef} style={{ borderRadius: '18px', height: '210px', boxShadow: '0 8px 25px rgba(5,59,34,0.12)' }}></div>
            {routingLoading ? (
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(5, 59, 34, 0.9)', padding: '6px 14px', borderRadius: '20px', color: '#FFFFFF', fontSize: '0.78rem', fontWeight: '700', zIndex: 500 }}>
                <i className="fa-solid fa-spinner fa-spin"></i> Drawing Road Route...
              </div>
            ) : (
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#FFFFFF', padding: '6px 12px', borderRadius: '20px', color: '#0D6E42', fontSize: '0.74rem', fontWeight: '700', zIndex: 500, border: '1px solid #E8E1D3' }}>
                <i className="fa-solid fa-route" style={{ color: '#0D6E42' }}></i> Turn-by-Turn Route
              </div>
            )}
          </div>

          {/* Route Distance Badge */}
          {routeInfo.distanceKm !== null && (
            <div style={{
              display: 'flex',
              justify: 'center',
              alignItems: 'center',
              gap: '10px',
              background: '#FFFFFF',
              border: '1px solid #0D6E42',
              borderRadius: '14px',
              padding: '12px 16px',
              marginTop: '14px',
              marginBottom: '16px',
              boxShadow: '0 4px 18px rgba(13, 110, 66, 0.12)'
            }}>
              <i className="fa-solid fa-route" style={{ color: '#0D6E42', fontSize: '1.25rem' }}></i>
              <span style={{ fontSize: '0.88rem', color: '#5D7063', fontWeight: '600' }}>Road Distance:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0D6E42' }}>{routeInfo.distanceKm} km</span>
            </div>
          )}

          <div className="card">
            {/* Pickup Location Field & Autocomplete Dropdown */}
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#0D6E42' }}></i> Pickup Location</label>
              <input 
                type="text" 
                className="input-field" 
                value={pickup} 
                onChange={handlePickupChange} 
                onFocus={() => pickupSuggestions.length > 0 && setShowPickupDropdown(true)}
                onBlur={() => setTimeout(() => setShowPickupDropdown(false), 250)}
                placeholder="Start typing pickup location (e.g. Salt Lake, Barasat)..."
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
                      <i className="fa-solid fa-location-dot" style={{ color: '#0D6E42' }}></i>
                      <div>
                        <div style={{ fontWeight: '700', color: '#11281A' }}>{item.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#5D7063' }}>{item.fullAddress}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Quick Preset Pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={fetchCurrentLocation} 
                disabled={fetchingGPS}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '16px', 
                  border: '1px solid #0D6E42', 
                  background: 'rgba(13, 110, 66, 0.1)', 
                  color: '#0D6E42', 
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid ${fetchingGPS ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i> 
                {fetchingGPS ? 'Fetching GPS...' : 'GPS Location'}
              </button>

              <button 
                type="button" 
                onClick={() => setPresetLocation('PICKUP', { lat: 22.5726, lng: 88.4337, name: 'Salt Lake Sector V, Kolkata' })} 
                style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #E8E1D3', background: '#F4EFE6', color: '#0D6E42', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-house"></i> Home
              </button>
              
              <button 
                type="button" 
                onClick={() => setPresetLocation('PICKUP', { lat: 22.7214, lng: 88.4816, name: 'Barasat Junction, Kolkata' })} 
                style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #E8E1D3', background: '#F4EFE6', color: '#0D6E42', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-location-dot"></i> Barasat
              </button>
            </div>

            {/* Destination Field with Automatic Suggestions */}
            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#c0392b' }}></i> Destination Location</label>
              <input 
                type="text" 
                className="input-field" 
                value={destination} 
                onChange={handleDestinationChange} 
                onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
                onBlur={() => setTimeout(() => setShowDestDropdown(false), 250)}
                placeholder="Start typing destination (e.g. Airport, Eco Park)..."
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
                      <i className="fa-solid fa-flag-checkered" style={{ color: '#c0392b' }}></i>
                      <div>
                        <div style={{ fontWeight: '700', color: '#11281A' }}>{item.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#5D7063' }}>{item.fullAddress}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Destination Shortcuts */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={fetchDestinationLocation} 
                disabled={fetchingDestGPS}
                style={{ 
                  padding: '6px 12px', 
                  borderRadius: '16px', 
                  border: '1px solid #c0392b', 
                  background: 'rgba(231, 76, 60, 0.08)', 
                  color: '#c0392b', 
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid ${fetchingDestGPS ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}></i> 
                {fetchingDestGPS ? 'Fetching Dest GPS...' : 'GPS Dest'}
              </button>

              <button 
                type="button" 
                onClick={() => setPresetLocation('DEST', { lat: 22.6547, lng: 88.4467, name: 'Kolkata Airport (CCU)' })} 
                style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #E8E1D3', background: '#F4EFE6', color: '#0D6E42', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-plane-departure"></i> Airport
              </button>

              <button 
                type="button" 
                onClick={() => setPresetLocation('DEST', { lat: 12.8452, lng: 77.6602, name: 'Electronic City HQ' })} 
                style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #E8E1D3', background: '#F4EFE6', color: '#0D6E42', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-briefcase"></i> E-City HQ
              </button>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label"><i className="fa-solid fa-chair" style={{ color: '#0D6E42' }}></i> Seats Needed</label>
                <select className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)}>
                  <option value={1}>1 Seat</option>
                  <option value={2}>2 Seats</option>
                  <option value={3}>3 Seats</option>
                </select>
              </div>

              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label"><i className="fa-solid fa-calendar-days" style={{ color: '#0D6E42' }}></i> Commute Pass</label>
                <div style={{ padding: '10px 12px', background: '#F4EFE6', borderRadius: '12px', border: '1px solid #E8E1D3', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="recurring" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} style={{ accentColor: '#0D6E42', width: '16px', height: '16px' }} />
                  <label htmlFor="recurring" style={{ cursor: 'pointer', color: '#0D6E42', fontWeight: '800' }}>Daily Pass</label>
                </div>
              </div>
            </div>

            <button type="submit" className="btn" disabled={loading} style={{ marginTop: '6px' }}>
              {loading ? 'Searching Available Rides...' : 'Find Available Rides'} <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button onClick={() => setStep('SEARCH')} style={{ background: 'none', border: 'none', color: '#0D6E42', cursor: 'pointer', marginBottom: '14px', fontSize: '0.85rem', fontWeight: '700' }}>
            <i className="fa-solid fa-arrow-left"></i> Modify Search Criteria
          </button>

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
          ) : rides.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '35px 20px' }}>
              <i className="fa-solid fa-car-burst" style={{ fontSize: '2.2rem', color: '#8E9F93', marginBottom: '12px' }}></i>
              <p style={{ color: '#5D7063', fontWeight: '600' }}>No active rides found matching your exact route.</p>
              <button onClick={() => setStep('SEARCH')} className="btn" style={{ width: 'auto', marginTop: '14px', padding: '8px 18px', fontSize: '0.82rem' }}>
                Search All Available Rides
              </button>
            </div>
          ) : (
            rides.map(ride => {
              const driverName = ride.driverId ? (ride.driverId.name || ride.driverName) : (ride.driverName || 'Corporate Driver');
              const vehicleModel = ride.vehicleId ? (ride.vehicleId.vehicleModel || ride.vehicleId.model || ride.vehicleModel) : (ride.vehicleModel || 'Corporate Car');
              const pickupText = ride.pickupLocation ? (ride.pickupLocation.address || ride.pickupLocation.name || 'Pickup Point') : 'Pickup Point';
              const destText = ride.destinationLocation ? (ride.destinationLocation.address || ride.destinationLocation.name || 'Destination Point') : (ride.destination ? (ride.destination.address || ride.destination.name) : 'Destination Point');

              return (
                <div key={ride._id} className="ride-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="avatar-circle">{driverName.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#11281A' }}>{driverName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#5D7063' }}><i className="fa-solid fa-car-side" style={{ color: '#0D6E42' }}></i> {vehicleModel}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0D6E42' }}>₹{ride.farePerSeat}</div>
                      <div style={{ fontSize: '0.7rem', color: '#5D7063', fontWeight: '600' }}>per seat</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#11281A', marginBottom: '12px', padding: '10px', background: '#F4EFE6', borderRadius: '12px', border: '1px solid #E8E1D3' }}>
                    <div><strong style={{ color: '#0D6E42' }}>From:</strong> {pickupText}</div>
                    <div style={{ marginTop: '4px' }}><strong style={{ color: '#c0392b' }}>To:</strong> {destText}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-emerald"><i className="fa-solid fa-chair"></i> {ride.availableSeats} seats left</span>
                    <button onClick={() => handleBookRide(ride._id)} className="btn" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}>
                      Book Seat <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

window.FindRideView = FindRideView;

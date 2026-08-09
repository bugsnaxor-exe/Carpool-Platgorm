const { useState, useEffect, useRef } = React;

function OfferRideView({ token, setActiveTab }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [pickup, setPickup] = useState('Acme Campus, Electronic City');
  const [destination, setDestination] = useState('Green Glen Layout, Bellandur');
  const [waypointInput, setWaypointInput] = useState('Silk Board Junction');
  const [seats, setSeats] = useState(3);
  const [fare, setFare] = useState(80);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Google Places Autocomplete State
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const pickupDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || data.vehicles || []);
      setVehicles(list);
      if (list.length > 0) {
        setSelectedVehicle(list[0]._id);
      }
    } catch (err) {
      console.error('[OfferRideView] Fetch Vehicles Error:', err);
    }
  };

  // Google Places Autocomplete Helper
  const fetchLocationSuggestions = (query, setSuggestions, setShowDropdown) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const q = query.trim();

    if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
      try {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          { input: q, componentRestrictions: { country: 'in' } },
          (predictions, status) => {
            if (status === 'OK' && predictions && predictions.length > 0) {
              const formatted = predictions.map(p => ({
                label: p.structured_formatting ? p.structured_formatting.main_text : p.description.split(',')[0],
                fullAddress: p.description
              }));
              setSuggestions(formatted);
              setShowDropdown(true);
            } else {
              setSuggestions([]);
              setShowDropdown(false);
            }
          }
        );
        return;
      } catch (e) {}
    }
  };

  const handlePickupChange = (e) => {
    const val = e.target.value;
    setPickup(val);
    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    pickupDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setPickupSuggestions, setShowPickupDropdown);
    }, 280);
  };

  const handleDestChange = (e) => {
    const val = e.target.value;
    setDestination(val);
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => {
      fetchLocationSuggestions(val, setDestSuggestions, setShowDestDropdown);
    }, 280);
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setMsg('');

    if (!selectedVehicle) {
      setMsg('❌ Please select a vehicle or register a vehicle in the Vehicles tab first!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rides/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          vehicleId: selectedVehicle,
          pickupLocation: pickup,
          destinationLocation: destination,
          destination: destination,
          waypoints: [waypointInput],
          availableSeats: Number(seats),
          totalSeats: Number(seats),
          farePerSeat: Number(fare),
          travelDateTime: new Date()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish ride');

      setMsg('✅ Ride published successfully! Redirecting to Find Rides...');
      setTimeout(() => {
        if (setActiveTab) setActiveTab('FIND');
      }, 1200);
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-transition">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>Offer a Ride</h3>
          <p style={{ fontSize: '0.8rem', color: '#5D7063' }}>Publish a commute route & share seats with co-workers</p>
        </div>
        <div className="badge badge-emerald">
          <i className="fa-solid fa-plus-circle"></i> Driver Mode
        </div>
      </div>

      {msg && (
        <div style={{ 
          padding: '10px 14px', 
          borderRadius: '12px', 
          fontSize: '0.82rem', 
          fontWeight: '700', 
          marginBottom: '14px',
          background: msg.startsWith('✅') ? 'rgba(13, 110, 66, 0.1)' : 'rgba(231, 76, 60, 0.1)',
          color: msg.startsWith('✅') ? '#0D6E42' : '#c0392b',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(13, 110, 66, 0.25)' : 'rgba(231, 76, 60, 0.25)'}`
        }}>
          {msg}
        </div>
      )}

      <div className="card">
        <form onSubmit={handlePublish}>
          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-car" style={{ color: '#0D6E42' }}></i> Select Registered Vehicle</label>
            {vehicles.length === 0 ? (
              <div style={{ padding: '12px', background: '#F4EFE6', borderRadius: '12px', border: '1px solid #E8E1D3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#c0392b', fontWeight: '700' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i> No vehicle registered yet.
                </span>
                <button type="button" onClick={() => setActiveTab && setActiveTab('VEHICLES')} style={{ padding: '6px 12px', background: '#0D6E42', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700' }}>
                  + Add Vehicle
                </button>
              </div>
            ) : (
              <select className="input-field" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleModel || v.model} ({v.registrationNumber}) • {v.fuelType || 'EV'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#0D6E42' }}></i> Pickup Location</label>
            <input 
              type="text" 
              className="input-field" 
              value={pickup} 
              onChange={handlePickupChange} 
              onFocus={() => pickupSuggestions.length > 0 && setShowPickupDropdown(true)}
              onBlur={() => setTimeout(() => setShowPickupDropdown(false), 250)}
              required 
            />

            {showPickupDropdown && pickupSuggestions.length > 0 && (
              <ul className="autocomplete-dropdown">
                {pickupSuggestions.map((item, idx) => (
                  <li key={idx} className="autocomplete-item" onMouseDown={() => { setPickup(item.label); setShowPickupDropdown(false); }}>
                    <i className="fa-solid fa-location-dot" style={{ color: '#0D6E42' }}></i>
                    <div>
                      <div style={{ fontWeight: '600' }}>{item.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#5D7063' }}>{item.fullAddress}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-route" style={{ color: '#0D6E42' }}></i> Intermediate Waypoint Stop</label>
            <input type="text" className="input-field" value={waypointInput} onChange={(e) => setWaypointInput(e.target.value)} placeholder="e.g. Silk Board Junction" />
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#c0392b' }}></i> Destination Location</label>
            <input 
              type="text" 
              className="input-field" 
              value={destination} 
              onChange={handleDestChange} 
              onFocus={() => destSuggestions.length > 0 && setShowDestDropdown(true)}
              onBlur={() => setTimeout(() => setShowDestDropdown(false), 250)}
              required 
            />

            {showDestDropdown && destSuggestions.length > 0 && (
              <ul className="autocomplete-dropdown">
                {destSuggestions.map((item, idx) => (
                  <li key={idx} className="autocomplete-item" onMouseDown={() => { setDestination(item.label); setShowDestDropdown(false); }}>
                    <i className="fa-solid fa-flag-checkered" style={{ color: '#c0392b' }}></i>
                    <div>
                      <div style={{ fontWeight: '600' }}>{item.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#5D7063' }}>{item.fullAddress}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><i className="fa-solid fa-users" style={{ color: '#0D6E42' }}></i> Seats</label>
              <input type="number" min="1" max="6" className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)} required />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><i className="fa-solid fa-indian-rupee-sign" style={{ color: '#0D6E42' }}></i> Fare / Seat</label>
              <input type="number" min="10" max="500" className="input-field" value={fare} onChange={(e) => setFare(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading || vehicles.length === 0} style={{ marginTop: '6px' }}>
            {loading ? 'Publishing Ride Offer...' : 'Publish Ride Offer'} <i className="fa-solid fa-plus-circle"></i>
          </button>
        </form>
      </div>
    </div>
  );
}

window.OfferRideView = OfferRideView;

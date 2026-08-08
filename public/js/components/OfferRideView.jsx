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
      setVehicles(data);
      if (data.length > 0) setSelectedVehicle(data[0]._id);
    } catch (err) {}
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
    if (!selectedVehicle) {
      alert('Please select a vehicle or add a new vehicle first!');
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
          waypoints: [waypointInput],
          availableSeats: seats,
          farePerSeat: fare
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Ride published successfully! Co-workers can now search and book seats.');
      setActiveTab('FIND');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>Offer a Ride</h3>

      <div className="card">
        <form onSubmit={handlePublish}>
          <div className="input-group">
            <label className="input-label">Select Registered Vehicle</label>
            {vehicles.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: '#f87171', marginBottom: '8px' }}>
                No vehicle registered. Please add a vehicle first in the Vehicles tab.
              </div>
            ) : (
              <select className="input-field" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.model} ({v.registrationNumber}) - {v.fuelType}</option>
                ))}
              </select>
            )}
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-location-dot" style={{ color: '#10b981' }}></i> Pickup Location (Google Places)</label>
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

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-route" style={{ color: '#3b82f6' }}></i> Intermediate Waypoint Stop</label>
            <input type="text" className="input-field" value={waypointInput} onChange={(e) => setWaypointInput(e.target.value)} placeholder="e.g. Silk Board Junction" />
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-flag-checkered" style={{ color: '#ef4444' }}></i> Destination Location (Google Places)</label>
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

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Available Seats</label>
              <input type="number" min="1" max="6" className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)} required />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Fare / Seat (₹)</label>
              <input type="number" min="10" max="500" className="input-field" value={fare} onChange={(e) => setFare(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary" disabled={loading || vehicles.length === 0}>
            {loading ? 'Publishing Ride...' : 'Publish Ride Offer'} <i className="fa-solid fa-plus-circle"></i>
          </button>
        </form>
      </div>
    </div>
  );
}

window.OfferRideView = OfferRideView;

const { useState, useEffect } = React;

function VehicleManagerView({ token }) {
  const [vehicles, setVehicles] = useState([]);
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [fuelType, setFuelType] = useState('EV');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState('');

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
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model,
          vehicleModel: model,
          registrationNumber: regNo,
          seatingCapacity: capacity,
          fuelType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add vehicle');

      setModel('');
      setRegNo('');
      fetchVehicles();
      setMsg('✅ Vehicle registered successfully!');
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
          <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>My Vehicles</h3>
          <p style={{ fontSize: '0.8rem', color: '#5D7063' }}>Manage your registered corporate fleet vehicles</p>
        </div>
        <div className="badge badge-emerald">
          <i className="fa-solid fa-car"></i> {vehicles.length} Fleet
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

      <div className="card" style={{ marginBottom: '18px' }}>
        <h4 style={{ fontSize: '1.02rem', fontWeight: '800', marginBottom: '14px', color: '#11281A', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-square-plus" style={{ color: '#0D6E42' }}></i> Add New Vehicle
        </h4>

        <form onSubmit={handleAddVehicle}>
          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-car-side" style={{ color: '#0D6E42' }}></i> Vehicle Model & Make</label>
            <input type="text" className="input-field" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Hyundai Creta / Tata Nexon EV" required />
          </div>

          <div className="input-group">
            <label className="input-label"><i className="fa-solid fa-id-card" style={{ color: '#0D6E42' }}></i> Registration Plate Number</label>
            <input type="text" className="input-field" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="e.g. WB-02-AD-5005" required />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><i className="fa-solid fa-users" style={{ color: '#0D6E42' }}></i> Seats</label>
              <input type="number" min="1" max="8" className="input-field" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label"><i className="fa-solid fa-charging-station" style={{ color: '#0D6E42' }}></i> Fuel Type</label>
              <select className="input-field" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="EV">Electric (EV)</option>
                <option value="HYBRID">Hybrid</option>
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
                <option value="CNG">CNG</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '4px' }}>
            {loading ? 'Registering Vehicle...' : 'Add Vehicle to Fleet'} <i className="fa-solid fa-car"></i>
          </button>
        </form>
      </div>

      <div>
        <h4 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '12px', color: '#11281A', fontFamily: 'Outfit, sans-serif' }}>Registered Vehicles</h4>
        {fetching ? (
          <div>
            {[1, 2].map(i => (
              <div key={i} className="skeleton-card" style={{ height: '65px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-line medium"></div>
                  <div className="skeleton skeleton-line short"></div>
                </div>
                <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '12px' }}></div>
              </div>
            ))}
          </div>
        ) : vehicles.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px', color: '#5D7063' }}>
            <i className="fa-solid fa-car" style={{ fontSize: '1.8rem', color: '#0D6E42', marginBottom: '8px' }}></i>
            <div>No vehicles registered yet. Add your vehicle using the form above.</div>
          </div>
        ) : (
          vehicles.map(v => (
            <div key={v._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '14px 16px' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.94rem', color: '#11281A' }}>{v.vehicleModel || v.model}</div>
                <div style={{ fontSize: '0.78rem', color: '#5D7063', marginTop: '2px' }}>
                  <i className="fa-solid fa-id-card" style={{ color: '#0D6E42' }}></i> {v.registrationNumber} • {v.seatingCapacity} Seats
                </div>
              </div>
              <span className="badge badge-emerald">
                <i className="fa-solid fa-leaf"></i> {v.fuelType || 'EV'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

window.VehicleManagerView = VehicleManagerView;

const { useState, useEffect } = React;

function VehicleManagerView({ token }) {
  const [vehicles, setVehicles] = useState([]);
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [fuelType, setFuelType] = useState('ELECTRIC');
  const [loading, setLoading] = useState(false);

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
    } catch (err) {}
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          model,
          registrationNumber: regNo,
          seatingCapacity: capacity,
          fuelType
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setModel('');
      setRegNo('');
      fetchVehicles();
      alert('Vehicle registered successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>My Vehicles</h3>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '12px' }}>Register New Vehicle</h4>
        <form onSubmit={handleAddVehicle}>
          <div className="input-group">
            <label className="input-label">Vehicle Model</label>
            <input type="text" className="input-field" placeholder="e.g. Tata Nexon EV" value={model} onChange={(e) => setModel(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Registration Number</label>
            <input type="text" className="input-field" placeholder="KA-01-AB-1234" value={regNo} onChange={(e) => setRegNo(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Seating Capacity</label>
              <input type="number" min="1" max="8" className="input-field" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
            </div>

            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Fuel / Power Type</label>
              <select className="input-field" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="ELECTRIC">Electric (EV)</option>
                <option value="HYBRID">Hybrid</option>
                <option value="PETROL">Petrol</option>
                <option value="DIESEL">Diesel</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Registering...' : 'Add Vehicle'}
          </button>
        </form>
      </div>

      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '10px' }}>Registered Fleet</h4>
        {vehicles.map(v => (
          <div key={v._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '12px 16px' }}>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{v.model}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{v.registrationNumber}</div>
            </div>
            <span className="badge badge-emerald">{v.fuelType}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

window.VehicleManagerView = VehicleManagerView;

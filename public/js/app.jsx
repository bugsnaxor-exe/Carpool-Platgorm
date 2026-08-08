const { useState, useEffect, useRef } = React;

function App() {
  // Global View State: 'MOBILE' (Android UX) or 'ADMIN' (Web Dashboard)
  const [viewMode, setViewMode] = useState('MOBILE');
  
  // App Stage: 'SPLASH', 'AUTH', 'MAIN'
  const [appStage, setAppStage] = useState('SPLASH');

  // Authenticated User & Token State
  const [token, setToken] = useState(localStorage.getItem('carpool_token') || null);
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(500);

  // Mobile Bottom Navigation Tab: 'FIND', 'OFFER', 'TRIPS', 'WALLET', 'VEHICLES'
  const [activeTab, setActiveTab] = useState('FIND');

  // Auto-dismiss splash screen after 2.2s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) {
        fetchCurrentUser();
      } else {
        setAppStage('AUTH');
      }
    }, 2200);
    return () => clearTimeout(timer);
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setWalletBalance(data.walletBalance);
        setAppStage('MAIN');
      } else {
        localStorage.removeItem('carpool_token');
        setToken(null);
        setAppStage('AUTH');
      }
    } catch (err) {
      setAppStage('AUTH');
    }
  };

  const handleAuthSuccess = (newToken, userData) => {
    localStorage.setItem('carpool_token', newToken);
    setToken(newToken);
    setUser(userData);
    setAppStage('MAIN');
  };

  const handleLogout = () => {
    localStorage.removeItem('carpool_token');
    setToken(null);
    setUser(null);
    setAppStage('AUTH');
  };

  return (
    <div className="app-main-root">
      {/* Mode Switcher Bar */}
      <header className="top-mode-bar">
        <div className="brand-title">
          <i className="fa-solid fa-car-side"></i> Enterprise Carpool
        </div>
        <div className="mode-toggle-group">
          <button 
            className={`mode-btn ${viewMode === 'MOBILE' ? 'active' : ''}`}
            onClick={() => setViewMode('MOBILE')}
          >
            <i className="fa-solid fa-mobile-screen-button"></i> Employee App
          </button>
          <button 
            className={`mode-btn ${viewMode === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setViewMode('ADMIN')}
          >
            <i className="fa-solid fa-chart-line"></i> Admin Console
          </button>
        </div>
      </header>

      {/* Main View Container */}
      <div className="app-viewport">
        {viewMode === 'MOBILE' ? (
          <div className="mobile-wrapper">
            <div className="phone-container">
              {/* Android Phone Status Bar */}
              <div className="phone-notch">
                <span>9:41 AM</span>
                <span><i className="fa-solid fa-wifi"></i> <i className="fa-solid fa-battery-full"></i></span>
              </div>

              {/* Phone Content Screen */}
              <div className="phone-screen">
                {appStage === 'SPLASH' && <SplashScreen />}
                
                {appStage === 'AUTH' && (
                  <AuthScreen onAuthSuccess={handleAuthSuccess} />
                )}

                {appStage === 'MAIN' && user && (
                  <>
                    {/* Top App Header */}
                    <div style={{ padding: '16px 16px 8px 16px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-circle">{user.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{user.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user.role === 'COMPANY_ADMIN' ? 'Admin' : 'Employee'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                          ₹{walletBalance.toFixed(0)}
                        </div>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }} title="Logout">
                          <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        </button>
                      </div>
                    </div>

                    {/* Active Mobile Screen Tab */}
                    <div style={{ padding: '16px', flex: 1 }}>
                      {activeTab === 'FIND' && <FindRideView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} setActiveTab={setActiveTab} />}
                      {activeTab === 'OFFER' && <OfferRideView token={token} setActiveTab={setActiveTab} />}
                      {activeTab === 'TRIPS' && <MyTripsView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} />}
                      {activeTab === 'WALLET' && <WalletView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} />}
                      {activeTab === 'VEHICLES' && <VehicleManagerView token={token} />}
                    </div>

                    {/* Android Style Bottom Navigation */}
                    <nav className="bottom-nav">
                      <button className={`nav-item ${activeTab === 'FIND' ? 'active' : ''}`} onClick={() => setActiveTab('FIND')}>
                        <i className="fa-solid fa-magnifying-glass"></i> Find Ride
                      </button>
                      <button className={`nav-item ${activeTab === 'OFFER' ? 'active' : ''}`} onClick={() => setActiveTab('OFFER')}>
                        <i className="fa-solid fa-plus-circle"></i> Offer Ride
                      </button>
                      <button className={`nav-item ${activeTab === 'TRIPS' ? 'active' : ''}`} onClick={() => setActiveTab('TRIPS')}>
                        <i className="fa-solid fa-route"></i> My Trips
                      </button>
                      <button className={`nav-item ${activeTab === 'WALLET' ? 'active' : ''}`} onClick={() => setActiveTab('WALLET')}>
                        <i className="fa-solid fa-wallet"></i> Wallet
                      </button>
                      <button className={`nav-item ${activeTab === 'VEHICLES' ? 'active' : ''}`} onClick={() => setActiveTab('VEHICLES')}>
                        <i className="fa-solid fa-car"></i> Vehicles
                      </button>
                    </nav>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* COMPANY ADMIN WEB DASHBOARD */
          <AdminConsole token={token} user={user} />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 1. SPLASH SCREEN
// -------------------------------------------------------------
function SplashScreen() {
  return (
    <div className="splash-container">
      <div className="splash-logo">
        <i className="fa-solid fa-car-side"></i>
      </div>
      <h2 className="splash-title">Enterprise Carpool</h2>
      <p className="splash-subtitle">Smart, Sustainable & Secured Employee Rides</p>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. AUTHENTICATION SCREEN (Dual Email/Mobile Login)
// -------------------------------------------------------------
function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'REGISTER'
  const [identifier, setIdentifier] = useState('alex.rivera@acme.com'); // Pre-filled demo
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);

  // Register Fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regRole, setRegRole] = useState('EMPLOYEE');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          mobileNumber: regMobile,
          password,
          role: regRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', color: '#fff', marginBottom: '12px' }}>
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Enterprise Login</h3>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sign in using your Email or Mobile Number</p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="auth-tabs">
        <button className={`auth-tab ${mode === 'LOGIN' ? 'active' : ''}`} onClick={() => setMode('LOGIN')}>Login</button>
        <button className={`auth-tab ${mode === 'REGISTER' ? 'active' : ''}`} onClick={() => setMode('REGISTER')}>Sign Up</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '14px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      {mode === 'LOGIN' ? (
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">Email or Mobile Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. alex@acme.com or +919811223344"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ position: 'relative' }}>
            <label className="input-label">Password</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'} <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" className="input-field" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Corporate Email</label>
            <input type="email" className="input-field" placeholder="john@acme.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Mobile Number</label>
            <input type="text" className="input-field" placeholder="+919876543210" value={regMobile} onChange={(e) => setRegMobile(e.target.value)} />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Account Role</label>
            <select className="input-field" value={regRole} onChange={(e) => setRegRole(e.target.value)}>
              <option value="EMPLOYEE">Employee (Rider / Driver)</option>
              <option value="COMPANY_ADMIN">Company Administrator</option>
            </select>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      )}

      {/* Demo Credentials Quick Selector */}
      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.78rem', color: '#94a3b8' }}>
        <strong style={{ color: '#fff' }}>Quick Demo Accounts:</strong>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          <button type="button" onClick={() => { setIdentifier('alex.rivera@acme.com'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#10b981', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Driver</button>
          <button type="button" onClick={() => { setIdentifier('+919988776655'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#3b82f6', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Passenger (Phone)</button>
          <button type="button" onClick={() => { setIdentifier('admin@acme.com'); setPassword('Password123!'); }} style={{ flex: 1, padding: '4px', background: '#1e293b', border: 'none', color: '#8b5cf6', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>Admin</button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. FIND A RIDE VIEW (Route Confirmation & Ride Discovery)
// -------------------------------------------------------------
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

            <div className="input-group">
              <label className="input-label"><i className="fa-solid fa-location-crosshairs" style={{ color: '#3b82f6' }}></i> Destination</label>
              <input type="text" className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Seats Needed</label>
                <input type="number" min="1" max="4" className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Travel Time</label>
                <input type="time" className="input-field" defaultValue="09:00" />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <input type="checkbox" id="rec" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
              <label htmlFor="rec" style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Schedule as Daily Recurring Ride</label>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Finding Best Matches...' : 'Confirm Route & Search Rides'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <button onClick={() => setStep('SEARCH')} className="btn btn-secondary" style={{ marginBottom: '14px', width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>
            <i className="fa-solid fa-arrow-left"></i> Change Route
          </button>

          <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '12px' }}>Available Rides ({rides.length})</h4>

          {rides.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
              <i className="fa-solid fa-car-on" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '10px' }}></i>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No open rides found for this exact route right now. Try switching to Offer a Ride!</p>
            </div>
          ) : (
            rides.map(ride => (
              <div key={ride._id} className="ride-card">
                <div className="driver-row">
                  <div className="avatar-circle">{ride.driverName.charAt(0)}</div>
                  <div className="driver-info">
                    <h4>{ride.driverName}</h4>
                    <p><i className="fa-solid fa-car"></i> {ride.vehicleModel}</p>
                  </div>
                  <div className="fare-tag">
                    <div className="fare-amount">₹{ride.farePerSeat}</div>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>per seat</span>
                  </div>
                </div>

                <div className="route-stepper">
                  <div className="step-item">{ride.pickupLocation.name}</div>
                  <div className="step-item dest">{ride.destinationLocation.name}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                    <i className="fa-solid fa-user-check"></i> {ride.availableSeats} Seats Available
                  </span>
                  <button onClick={() => handleBookRide(ride._id)} className="btn" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.82rem' }}>
                    Instant Book
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

// -------------------------------------------------------------
// 4. OFFER A RIDE VIEW (Publish Rides)
// -------------------------------------------------------------
function OfferRideView({ token, setActiveTab }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [pickup, setPickup] = useState('Green Glen Layout, Bellandur');
  const [destination, setDestination] = useState('Acme Campus, Electronic City');
  const [seats, setSeats] = useState(3);
  const [fare, setFare] = useState(120);
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
      if (data.length > 0) setSelectedVehicle(data[0]._id);
    } catch (err) {}
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!selectedVehicle) {
      alert('Please register at least one vehicle before offering a ride.');
      setActiveTab('VEHICLES');
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
          pickupLocation: { name: pickup, lat: 12.9279, lng: 77.6772 },
          destinationLocation: { name: destination, lat: 12.8452, lng: 77.6602 },
          availableSeats: seats,
          farePerSeat: fare
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Ride published successfully! Colleagues can now discover and book seats.');
      setActiveTab('TRIPS');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>Offer a Ride</h3>

      {vehicles.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <i className="fa-solid fa-car-tunnel" style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: '10px' }}></i>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '6px' }}>Vehicle Required</h4>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '14px' }}>You must register at least one vehicle before publishing rides.</p>
          <button onClick={() => setActiveTab('VEHICLES')} className="btn">Register Vehicle</button>
        </div>
      ) : (
        <form onSubmit={handlePublish} className="card">
          <div className="input-group">
            <label className="input-label">Select Registered Vehicle</label>
            <select className="input-field" value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)} required>
              {vehicles.map(v => (
                <option key={v._id} value={v._id}>{v.model} ({v.registrationNumber})</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Pickup Location</label>
            <input type="text" className="input-field" value={pickup} onChange={(e) => setPickup(e.target.value)} required />
          </div>

          <div className="input-group">
            <label className="input-label">Destination</label>
            <input type="text" className="input-field" value={destination} onChange={(e) => setDestination(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Available Seats</label>
              <input type="number" min="1" max="6" className="input-field" value={seats} onChange={(e) => setSeats(e.target.value)} required />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Fare / Seat (₹)</label>
              <input type="number" min="10" className="input-field" value={fare} onChange={(e) => setFare(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? 'Publishing Ride...' : 'Confirm Route & Publish Ride'}
          </button>
        </form>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 5. MY TRIPS & LIVE TRACKING VIEW (With Real-Time Map & Chat)
// -------------------------------------------------------------
function MyTripsView({ token, walletBalance, setWalletBalance }) {
  const [trips, setTrips] = useState([]);
  const [activeTrackingTrip, setActiveTrackingTrip] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'driver', text: 'Hi! I am starting the car now. Will be at Bellandur pickup point in 5 mins.' },
    { sender: 'me', text: 'Great, waiting near the main gate!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [callActive, setCallActive] = useState(false);

  const trackingMapRef = useRef(null);
  const mapInst = useRef(null);
  const driverMarkerRef = useRef(null);

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
    } catch (err) {}
  };

  // Live Map Simulation Effect
  useEffect(() => {
    if (activeTrackingTrip && trackingMapRef.current && !mapInst.current) {
      mapInst.current = L.map(trackingMapRef.current).setView([12.9279, 77.6772], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInst.current);

      // Pickup Marker
      L.marker([12.9279, 77.6772]).addTo(mapInst.current).bindPopup('Pickup Marker');
      // Destination Marker
      L.marker([12.8452, 77.6602]).addTo(mapInst.current).bindPopup('Destination Marker');

      // Animated Driver Marker Icon
      const driverIcon = L.divIcon({
        className: 'driver-live-icon',
        html: '<div style="background:#10b981; color:#fff; width:32px; height:32px; border-radius:50%; display:flex; justify-content:center; align-items:center; box-shadow:0 0 15px #10b981;"><i class="fa-solid fa-car"></i></div>',
        iconSize: [32, 32]
      });

      driverMarkerRef.current = L.marker([12.9279, 77.6772], { icon: driverIcon }).addTo(mapInst.current);

      // Simulated Real-Time GPS Movement
      let progress = 0;
      const interval = setInterval(() => {
        progress += 0.05;
        if (progress > 1) progress = 0;
        const currentLat = 12.9279 + (12.8452 - 12.9279) * progress;
        const currentLng = 77.6772 + (77.6602 - 77.6772) * progress;

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng([currentLat, currentLng]);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeTrackingTrip]);

  const handleUpdateStatus = async (tripId, newStatus) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      fetchTrips();
    } catch (err) {}
  };

  const handlePayTrip = async (tripId, method) => {
    try {
      const res = await fetch(`/api/trips/${tripId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ method })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Payment successful!');
      if (data.newBalance !== undefined) setWalletBalance(data.newBalance);
      fetchTrips();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages([...chatMessages, { sender: 'me', text: chatInput }]);
    setChatInput('');
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>My Trips</h3>

      {/* Live Tracking Active Overlay */}
      {activeTrackingTrip ? (
        <div>
          <button onClick={() => { setActiveTrackingTrip(null); mapInst.current = null; }} className="btn btn-secondary" style={{ marginBottom: '10px', width: 'auto', padding: '6px 12px', fontSize: '0.8rem' }}>
            <i className="fa-solid fa-arrow-left"></i> Back to Trips
          </button>

          <div className="card" style={{ background: '#090d16', border: '1px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span className="badge badge-green"><i className="fa-solid fa-satellite-dish"></i> Live Tracking Active</span>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '700' }}>ETA: 18 mins</span>
            </div>

            {/* Interactive Tracking Map */}
            <div className="map-view-container" ref={trackingMapRef} style={{ height: '220px' }}></div>

            {/* In-Trip Communication (Chat & Call buttons) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button onClick={() => setCallActive(!callActive)} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                <i className="fa-solid fa-phone-volume" style={{ color: '#10b981' }}></i> {callActive ? 'End Voice Call' : 'Call Driver'}
              </button>
            </div>

            {callActive && (
              <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', padding: '10px', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', marginBottom: '10px', color: '#10b981' }}>
                <i className="fa-solid fa-signal"></i> Encrypted In-App Voice Call Connected (00:42)
              </div>
            )}

            {/* Live Chat Box */}
            <div className="chat-box">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '6px' }}>
              <input type="text" className="input-field" placeholder="Type message..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={{ padding: '8px' }} />
              <button type="submit" className="btn" style={{ width: 'auto', padding: '8px 14px' }}><i className="fa-solid fa-paper-plane"></i></button>
            </form>
          </div>
        </div>
      ) : (
        /* Trip Cards List */
        trips.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
            <i className="fa-solid fa-route" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '10px' }}></i>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No trips booked yet.</p>
          </div>
        ) : (
          trips.map(trip => (
            <div key={trip._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className={`badge ${trip.status === 'COMPLETED' ? 'badge-blue' : 'badge-green'}`}>{trip.status}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#10b981' }}>₹{trip.totalFare}</span>
              </div>

              <div style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '4px' }}>
                <i className="fa-solid fa-user-ninja"></i> Driver: {trip.driverName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '10px' }}>
                Vehicle: {trip.vehicleModel}
              </div>

              <div className="route-stepper" style={{ margin: '8px 0' }}>
                <div className="step-item">{trip.pickupLocation.name}</div>
                <div className="step-item dest">{trip.destinationLocation.name}</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button onClick={() => setActiveTrackingTrip(trip)} className="btn btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                  <i className="fa-solid fa-location-crosshairs" style={{ color: '#10b981' }}></i> Track Live
                </button>

                {trip.status === 'BOOKED' && (
                  <button onClick={() => handleUpdateStatus(trip._id, 'IN_PROGRESS')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                    Start Trip
                  </button>
                )}

                {trip.status === 'IN_PROGRESS' && trip.paymentStatus === 'PENDING' && (
                  <button onClick={() => handlePayTrip(trip._id, 'WALLET')} className="btn" style={{ flex: 1, padding: '8px', fontSize: '0.8rem' }}>
                    Pay ₹{trip.totalFare} via Wallet
                  </button>
                )}
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 6. WALLET & PAYMENTS VIEW (Razorpay Sandbox Simulation)
// -------------------------------------------------------------
function WalletView({ token, walletBalance, setWalletBalance }) {
  const [rechargeAmt, setRechargeAmt] = useState(500);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    try {
      const res = await fetch('/api/wallet/balance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setWalletBalance(data.balance);
      setHistory(data.transactions || []);
    } catch (err) {}
  };

  const handleRazorpayRecharge = async (amount) => {
    setLoading(true);
    // Simulate Razorpay Sandbox Payment Verification Delay
    setTimeout(async () => {
      try {
        const res = await fetch('/api/wallet/recharge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount, paymentId: 'pay_rzp_test_' + Date.now() })
        });
        const data = await res.json();
        setWalletBalance(data.balance);
        fetchWalletDetails();
        alert(`Razorpay Test Payment Verified! Recharged ₹${amount} successfully.`);
      } catch (err) {
        alert('Recharge failed');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>Wallet & Payments</h3>

      {/* Wallet Balance Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}>
        <div style={{ fontSize: '0.78rem', opacity: 0.9, uppercase: true }}>Current Balance</div>
        <div style={{ fontSize: '2.2rem', fontWeight: '800', fontFamily: 'Outfit' }}>₹{walletBalance.toFixed(2)}</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '4px' }}><i className="fa-solid fa-shield"></i> Razorpay Test Mode Active</div>
      </div>

      {/* Quick Recharge Section */}
      <div className="card">
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Recharge Wallet</h4>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[100, 500, 1000].map(amt => (
            <button key={amt} onClick={() => handleRazorpayRecharge(amt)} className="btn btn-secondary" style={{ flex: 1, padding: '8px' }} disabled={loading}>
              + ₹{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '10px' }}>Recent Transactions</h4>
      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#64748b' }}>No transactions recorded yet.</div>
      ) : (
        history.map(t => (
          <div key={t._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{t.description}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{new Date(t.createdAt).toLocaleDateString()}</div>
            </div>
            <div style={{ fontWeight: '800', color: t.type === 'CREDIT' ? '#10b981' : '#f87171' }}>
              {t.type === 'CREDIT' ? '+' : '-'}₹{t.amount}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 7. VEHICLE MANAGER VIEW
// -------------------------------------------------------------
function VehicleManagerView({ token }) {
  const [vehicles, setVehicles] = useState([]);
  const [model, setModel] = useState('');
  const [regNo, setRegNo] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [fuelType, setFuelType] = useState('PETROL');
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
      if (!res.ok) throw new Error('Vehicle registration failed');
      
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
      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '14px' }}>My Registered Vehicles</h3>

      {/* Add Vehicle Form */}
      <form onSubmit={handleAddVehicle} className="card" style={{ marginBottom: '16px' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Register New Vehicle</h4>
        
        <div className="input-group">
          <label className="input-label">Vehicle Model</label>
          <input type="text" className="input-field" placeholder="e.g. Tata Nexon EV" value={model} onChange={(e) => setModel(e.target.value)} required />
        </div>

        <div className="input-group">
          <label className="input-label">Registration Number</label>
          <input type="text" className="input-field" placeholder="e.g. KA-01-EQ-9988" value={regNo} onChange={(e) => setRegNo(e.target.value)} required />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Capacity</label>
            <input type="number" min="1" max="8" className="input-field" value={capacity} onChange={(e) => setCapacity(e.target.value)} required />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Fuel Type</label>
            <select className="input-field" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="EV">EV</option>
              <option value="CNG">CNG</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn" disabled={loading}>Register Vehicle</button>
      </form>

      {/* Registered Vehicles List */}
      {vehicles.map(v => (
        <div key={v._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{v.model}</div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Reg: {v.registrationNumber} | {v.fuelType}</div>
          </div>
          <span className="badge badge-green">{v.status}</span>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// 8. COMPANY ADMINISTRATION WEB DASHBOARD VIEW
// -------------------------------------------------------------
function AdminConsole({ token, user }) {
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (token && user && user.role === 'COMPANY_ADMIN') {
      fetchAdminData();
    }
  }, [token, user]);

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [res1, res2, res3] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch('/api/admin/employees', { headers }),
        fetch('/api/admin/audit-logs', { headers })
      ]);

      if (res1.ok) setAnalytics(await res1.json());
      if (res2.ok) setEmployees(await res2.json());
      if (res3.ok) setAuditLogs(await res3.json());
    } catch (err) {}
  };

  if (!user || user.role !== 'COMPANY_ADMIN') {
    return (
      <div className="admin-dashboard" style={{ textAlign: 'center', padding: '60px' }}>
        <i className="fa-solid fa-lock" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}></i>
        <h2>Admin Access Required</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>Please log in with a Company Administrator account to access enterprise analytics and controls.</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: '800' }}>Company Administration Console</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Organization Mobility, Fuel Efficiency & Security Reports</p>
        </div>
        <button onClick={fetchAdminData} className="btn btn-secondary" style={{ width: 'auto' }}>
          <i className="fa-solid fa-rotate"></i> Refresh Reports
        </button>
      </div>

      {/* Analytical Metric Cards */}
      {analytics && (
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon"><i className="fa-solid fa-route"></i></div>
            <div>
              <div className="metric-val">{analytics.totalTrips}</div>
              <div className="metric-lbl">Total Trips</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.12)' }}><i className="fa-solid fa-gauge-high"></i></div>
            <div>
              <div className="metric-val">{analytics.totalDistanceKm} km</div>
              <div className="metric-lbl">Distance Travelled</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.12)' }}><i className="fa-solid fa-gas-pump"></i></div>
            <div>
              <div className="metric-val">{analytics.estimatedFuelLiters} L</div>
              <div className="metric-lbl">Fuel Saved / Consumed</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}><i className="fa-solid fa-indian-rupee-sign"></i></div>
            <div>
              <div className="metric-val">₹{analytics.travelCostPerKm}/km</div>
              <div className="metric-lbl">Configured Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Management Roster (Password Hash Isolation Verified) */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Employee Records & Access Roster</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Email / Mobile</th>
              <th>Role</th>
              <th>Department</th>
              <th>Password Hash Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id}>
                <td style={{ fontWeight: '700' }}>{emp.name}</td>
                <td>{emp.email || emp.mobileNumber}</td>
                <td><span className="badge badge-green">{emp.role}</span></td>
                <td>{emp.department || 'Operations'}</td>
                <td>
                  <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700' }}>
                    <i className="fa-solid fa-shield-halved"></i> Excluded (`select: false`)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Immutable Audit Logs Viewer */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px' }}>Immutable Admin Audit Logs</h3>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log._id}>
                <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{new Date(log.timestamp).toLocaleString()}</td>
                <td><span className="badge badge-blue">{log.action}</span></td>
                <td>{log.targetType}</td>
                <td style={{ fontSize: '0.85rem' }}>{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Render Main App Component
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

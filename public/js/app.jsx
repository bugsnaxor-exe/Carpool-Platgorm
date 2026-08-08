const { useState, useEffect } = React;

function App() {
  // Global View Mode: 'MOBILE' (Android UX) or 'ADMIN' (Web Dashboard)
  const [viewMode, setViewMode] = useState('MOBILE');
  
  // App Stage: 'SPLASH', 'AUTH', 'MAIN'
  const [appStage, setAppStage] = useState('SPLASH');

  // Authenticated User & Token State
  const [token, setToken] = useState(localStorage.getItem('carpool_token') || null);
  const [user, setUser] = useState(null);
  const [walletBalance, setWalletBalance] = useState(500);

  // Mobile Bottom Navigation Tab: 'FIND', 'OFFER', 'TRIPS', 'WALLET', 'VEHICLES'
  const [activeTab, setActiveTab] = useState('FIND');

  // Auto-dismiss splash screen after 2s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (token) {
        fetchCurrentUser();
      } else {
        setAppStage('AUTH');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const currentUser = data.user || data;
        setUser(currentUser);
        setWalletBalance(Number(data.walletBalance ?? currentUser.walletBalance ?? 500));
        setAppStage('MAIN');
      } else {
        localStorage.removeItem('carpool_token');
        setToken(null);
        setUser(null);
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

  // Extract component references from window
  const SplashScreen = window.SplashScreen;
  const AuthScreen = window.AuthScreen;
  const FindRideView = window.FindRideView;
  const OfferRideView = window.OfferRideView;
  const MyTripsView = window.MyTripsView;
  const WalletView = window.WalletView;
  const VehicleManagerView = window.VehicleManagerView;
  const AdminConsole = window.AdminConsole;

  return (
    <div className="app-main-root">
      {/* Top Navigation & Mode Switcher Bar */}
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
              {/* Android Status Bar */}
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
                          ₹{Number(walletBalance || 0).toFixed(0)}
                        </div>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }} title="Logout">
                          <i className="fa-solid fa-arrow-right-from-bracket"></i>
                        </button>
                      </div>
                    </div>

                    {/* Active Mobile Screen Tab */}
                    <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
                      {activeTab === 'FIND' && <FindRideView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} setActiveTab={setActiveTab} />}
                      {activeTab === 'OFFER' && <OfferRideView token={token} setActiveTab={setActiveTab} />}
                      {activeTab === 'TRIPS' && <MyTripsView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} />}
                      {activeTab === 'WALLET' && <WalletView token={token} walletBalance={walletBalance} setWalletBalance={setWalletBalance} />}
                      {activeTab === 'VEHICLES' && <VehicleManagerView token={token} />}
                    </div>

                    {/* Android Style Bottom Navigation Bar */}
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

// Render Root Component
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

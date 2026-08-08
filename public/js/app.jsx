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
                    {/* Minimal Warm Header */}
                    <div className="phone-header">
                      <div className="user-greeting">
                        Hello, <strong>{user ? user.name.split(' ')[0] : 'User'}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(13, 110, 66, 0.1)', color: '#0D6E42', padding: '5px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: '800', border: '1px solid rgba(13, 110, 66, 0.2)' }}>
                          ₹{Number(walletBalance || 0).toFixed(0)}
                        </div>
                        <button className="avatar-icon-btn" onClick={handleLogout} title="Logout">
                          <i className="fa-regular fa-user"></i>
                        </button>
                      </div>
                    </div>

                    {/* Active Mobile Screen Tab */}
                    <div className="mobile-content-area">
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
          <div className="desktop-wrapper">
            <AdminConsole token={token} user={user} />
          </div>
        )}
      </div>
    </div>
  );
}

// Render Root Component
ReactDOM.createRoot(document.getElementById('root')).render(<App />);

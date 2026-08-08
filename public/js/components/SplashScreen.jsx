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

window.SplashScreen = SplashScreen;

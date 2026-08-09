(function() {
  // Dynamic Google Maps JS loader with Places & Geometry libraries
  const apiKey = (window.ENV && window.ENV.GOOGLE_MAPS_API_KEY) || '';
  if (apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  window.initGoogleMaps = function() {
    window.googleMapsReady = true;
    window.dispatchEvent(new Event('google-maps-loaded'));
  };
})();

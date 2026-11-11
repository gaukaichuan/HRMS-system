(() => {
  'use strict';

  const locationStatus = document.querySelector('#location-status');
  const locationIndicator = document.querySelector('#location-indicator');
  const locationButton = document.querySelector('#location-check');
  const networkStatus = document.querySelector('#network-status');
  const networkIndicator = document.querySelector('#network-indicator');
  const message = document.querySelector('#device-check-message');

  function setIndicator(element, state) {
    if (!element) return;
    element.classList.remove('is-ready', 'is-unavailable', 'is-checking');
    if (state) element.classList.add(state);
  }

  // navigator.onLine reports a browser network connection, not specifically Wi-Fi.
  function updateNetworkStatus() {
    const online = navigator.onLine;
    if (networkStatus) networkStatus.textContent = online
      ? 'Online · Wi-Fi or mobile data'
      : 'Offline';
    setIndicator(networkIndicator, online ? 'is-ready' : 'is-unavailable');
  }

  async function checkPermissionState() {
    if (!navigator.permissions?.query || !locationStatus) return;
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        locationStatus.textContent = 'Permission blocked in browser settings';
        setIndicator(locationIndicator, 'is-unavailable');
      } else if (permission.state === 'granted') {
        locationStatus.textContent = 'Permission allowed · tap to test access';
        setIndicator(locationIndicator, 'is-ready');
      } else {
        locationStatus.textContent = 'Permission not requested';
        setIndicator(locationIndicator, '');
      }
      permission.addEventListener('change', () => {
        if (permission.state === 'denied') {
          locationStatus.textContent = 'Permission blocked in browser settings';
          setIndicator(locationIndicator, 'is-unavailable');
        } else if (permission.state === 'granted') {
          locationStatus.textContent = 'Permission allowed · tap to test access';
          setIndicator(locationIndicator, 'is-ready');
        } else {
          locationStatus.textContent = 'Permission not requested';
          setIndicator(locationIndicator, '');
        }
      });
    } catch {
      // Some mobile browsers do not expose the Permissions API.
      if (locationStatus.textContent === 'Checking…') {
        locationStatus.textContent = 'Tap to test location access';
      }
    }
  }

  function checkLocationAccess() {
    if (!locationStatus || !locationButton) return;
    if (!('geolocation' in navigator)) {
      locationStatus.textContent = 'Location is not supported by this browser';
      setIndicator(locationIndicator, 'is-unavailable');
      if (message) message.textContent = 'You can continue browsing, but this browser cannot provide location access.';
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      locationStatus.textContent = 'Secure HTTPS page required';
      setIndicator(locationIndicator, 'is-unavailable');
      if (message) message.textContent = 'Phone location access requires HTTPS. Open the hosted secure URL to check it.';
      return;
    }

    locationButton.disabled = true;
    locationButton.textContent = 'Checking…';
    locationStatus.textContent = 'Waiting for phone location…';
    setIndicator(locationIndicator, 'is-checking');
    if (message) message.textContent = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        locationStatus.textContent = `Available · about ${accuracy} m accuracy`;
        setIndicator(locationIndicator, 'is-ready');
        locationButton.disabled = false;
        locationButton.textContent = 'Check location again';
        if (message) message.textContent = 'Location access is available. The location coordinates were checked in memory only and were not saved or sent.';
      },
      (error) => {
        const denied = error.code === error.PERMISSION_DENIED;
        const unavailable = error.code === error.POSITION_UNAVAILABLE;
        locationStatus.textContent = denied
          ? 'Permission denied'
          : unavailable
            ? 'Phone location is unavailable or turned off'
            : 'Location check timed out';
        setIndicator(locationIndicator, 'is-unavailable');
        locationButton.disabled = false;
        locationButton.textContent = 'Try location again';
        if (message) message.textContent = denied
          ? 'Allow location permission in your browser and phone settings, then try again.'
          : 'Check that phone Location Services are enabled and try again.';
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  if (locationButton) locationButton.addEventListener('click', checkLocationAccess);
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
  if (locationStatus) locationStatus.textContent = 'Checking…';
  checkPermissionState();
})();

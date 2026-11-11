(() => {
  'use strict';

  const STORAGE_KEY = 'peopledesk-mobile-clock-demo-v1';
  const methodCopy = {
    wifi: 'A browser cannot confirm the name of the Wi-Fi network. This method is for layout preview only.',
    location: 'Location is requested only when you tap “Check my location”. Coordinates are shown briefly and are not saved.',
    face: 'Face verification is not configured. This page will not open the camera or collect face data.'
  };

  const timeEl = document.querySelector('#live-time');
  const dateEl = document.querySelector('#live-date');
  const statusEl = document.querySelector('#shift-status');
  const clockInEl = document.querySelector('#clock-in-value');
  const clockOutEl = document.querySelector('#clock-out-value');
  const actionButton = document.querySelector('#clock-action');
  const actionMessage = document.querySelector('#action-message');
  const methodDetail = document.querySelector('#method-detail');
  const locationButton = document.querySelector('#location-check');
  const methodOptions = [...document.querySelectorAll('[data-method]')];

  let selectedMethod = 'wifi';
  let locationChecked = false;

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function readAttendance() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return saved?.businessDate === localDateKey() ? saved : null;
    } catch (error) {
      console.warn('Could not read the local clock preview.', error);
      return null;
    }
  }

  function writeAttendance(record) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
      return true;
    } catch (error) {
      console.error('Could not save the local clock preview.', error);
      return false;
    }
  }

  function displayTime(iso) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(iso));
  }

  function updateClock() {
    const now = new Date();
    timeEl.textContent = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric', minute: '2-digit', second: '2-digit'
    }).format(now);
    dateEl.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).format(now);
  }

  function render() {
    const record = readAttendance();
    clockInEl.textContent = displayTime(record?.clockInAt);
    clockOutEl.textContent = displayTime(record?.clockOutAt);
    statusEl.classList.remove('is-working', 'is-done');

    if (!record) {
      statusEl.textContent = 'Not clocked in';
      actionButton.textContent = 'Clock in';
      actionButton.disabled = selectedMethod === 'face';
    } else if (!record.clockOutAt) {
      statusEl.textContent = 'On shift';
      statusEl.classList.add('is-working');
      actionButton.textContent = 'Clock out';
      actionButton.disabled = selectedMethod === 'face';
    } else {
      statusEl.textContent = 'Shift complete';
      statusEl.classList.add('is-done');
      actionButton.textContent = 'Shift complete';
      actionButton.disabled = true;
    }

    if (selectedMethod === 'face') actionButton.disabled = true;
    if (selectedMethod === 'location' && !locationChecked) actionButton.disabled = true;
  }

  function setMessage(message, isError = false) {
    actionMessage.textContent = message;
    actionMessage.classList.toggle('is-error', isError);
  }

  methodOptions.forEach((option) => {
    option.addEventListener('click', () => {
      if (option.dataset.method === 'face') return;
      selectedMethod = option.dataset.method;
      locationChecked = false;
      methodOptions.forEach((item) => {
        const selected = item === option;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      methodDetail.textContent = methodCopy[selectedMethod];
      locationButton.hidden = selectedMethod !== 'location';
      locationButton.disabled = false;
      locationButton.textContent = 'Check my location';
      setMessage('');
      render();
    });
  });

  locationButton.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      setMessage('Location is not supported by this browser. You can choose Office Wi-Fi preview instead.', true);
      return;
    }
    if (!window.isSecureContext && location.hostname !== 'localhost') {
      setMessage('Phone location requires HTTPS. Open this page from a secure hosted URL, or choose another preview method.', true);
      return;
    }

    locationButton.disabled = true;
    locationButton.textContent = 'Checking location…';
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationChecked = true;
        const accuracy = Math.round(position.coords.accuracy);
        methodDetail.textContent = `Location permission granted (about ${accuracy} m accuracy). This preview does not check an office boundary or send/save your coordinates.`;
        locationButton.textContent = 'Location checked';
        locationButton.disabled = false;
        render();
      },
      (error) => {
        locationChecked = false;
        const message = error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow it in your browser settings or choose another method.'
          : 'Could not get your location. Check your settings and try again, or choose another method.';
        methodDetail.textContent = message;
        locationButton.textContent = 'Try location again';
        locationButton.disabled = false;
        render();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });

  actionButton.addEventListener('click', () => {
    if (selectedMethod === 'face') return;
    if (selectedMethod === 'location' && !locationChecked) {
      setMessage('Check your location first, or choose Office Wi-Fi preview.', true);
      return;
    }

    const record = readAttendance() || {
      businessDate: localDateKey(),
      clockInAt: null,
      clockOutAt: null,
      methods: {}
    };

    if (!record.clockInAt) {
      record.clockInAt = new Date().toISOString();
      record.methods.clockIn = selectedMethod;
    } else if (!record.clockOutAt) {
      record.clockOutAt = new Date().toISOString();
      record.methods.clockOut = selectedMethod;
    } else {
      return;
    }

    if (!writeAttendance(record)) {
      setMessage('Could not save this preview action in the browser. Check storage and try again.', true);
      return;
    }

    const label = record.clockOutAt ? 'Clock-out' : 'Clock-in';
    setMessage(`${label} added to this device's preview only. It has not been sent to a server.`);
    locationChecked = false;
    if (selectedMethod === 'location') {
      locationButton.textContent = 'Check my location';
      methodDetail.textContent = methodCopy.location;
    }
    render();
  });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) render();
  });

  updateClock();
  window.setInterval(updateClock, 1000);
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.info('Offline page caching is unavailable.', error);
      });
    });
  }
})();

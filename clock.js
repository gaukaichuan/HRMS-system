(() => {
  'use strict';

  const ATTENDANCE_KEY = 'peopledesk-mobile-clock-demo-v1';
  const REQUESTS_KEY = 'peopledesk-employee-requests-demo-v1';
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
  const pagePanels = [...document.querySelectorAll('[data-page-panel]')];
  const menuLinks = [...document.querySelectorAll('[data-page-link]')];
  const navItems = [...document.querySelectorAll('.employee-nav-item')];

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
      const saved = JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || 'null');
      return saved?.businessDate === localDateKey() ? saved : null;
    } catch (error) {
      console.warn('Could not read the local clock preview.', error);
      return null;
    }
  }

  function writeAttendance(record) {
    try {
      localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(record));
      return true;
    } catch (error) {
      console.error('Could not save the local clock preview.', error);
      return false;
    }
  }

  function displayTime(iso) {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  }

  function updateClock() {
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(now);
    dateEl.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(now);
  }

  function renderAttendance() {
    if (!statusEl || !clockInEl || !clockOutEl || !actionButton) return;
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
    if (!actionMessage) return;
    actionMessage.textContent = message;
    actionMessage.classList.toggle('is-error', isError);
  }

  function showPage(pageName) {
    const target = document.querySelector(`#page-${pageName}`);
    if (!target) return;
    pagePanels.forEach((panel) => { panel.hidden = panel !== target; });
    navItems.forEach((item) => {
      const active = item.dataset.pageLink === pageName;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const titles = { menu: 'Menu', attendance: 'Attendance', leave: 'Issue leave', wfh: 'Request WFH', about: 'About' };
    document.title = `${titles[pageName] || 'Employee app'} · PeopleDesk`;
    if (pageName === 'leave') renderRequests('leave');
    if (pageName === 'wfh') renderRequests('wfh');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  menuLinks.forEach((link) => {
    link.addEventListener('click', () => showPage(link.dataset.pageLink));
  });

  function readRequests() {
    try {
      const list = JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.warn('Could not read local demo requests.', error);
      return [];
    }
  }

  function writeRequests(requests) {
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
      return true;
    } catch (error) {
      console.error('Could not save local demo requests.', error);
      return false;
    }
  }

  function renderRequests(type) {
    const target = document.querySelector(type === 'leave' ? '#leave-request-list' : '#wfh-request-list');
    if (!target) return;
    const items = readRequests().filter((item) => item.type === type).slice().reverse();
    target.replaceChildren();

    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'request-empty';
      empty.textContent = 'No requests saved on this device yet.';
      target.append(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'request-item';
      const title = document.createElement('strong');
      title.textContent = type === 'leave' ? item.leaveType : 'Work from home';
      const dates = document.createElement('span');
      dates.textContent = item.startDate === item.endDate ? item.startDate : `${item.startDate} – ${item.endDate}`;
      const reason = document.createElement('p');
      reason.textContent = item.reason;
      const state = document.createElement('small');
      state.textContent = 'Saved locally · not submitted to backend';
      card.append(title, dates, reason, state);
      target.append(card);
    });
  }

  function setupRequestForm(formId, type) {
    const form = document.querySelector(formId);
    if (!form) return;
    const message = form.querySelector('.form-message');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const startDate = String(data.get('startDate') || '');
      const endDate = String(data.get('endDate') || '');
      if (endDate < startDate) {
        message.textContent = 'The end date must be on or after the start date.';
        message.classList.add('is-error');
        form.elements.endDate.focus();
        return;
      }
      const requests = readRequests();
      const request = {
        id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        startDate,
        endDate,
        reason: String(data.get('reason') || '').trim(),
        leaveType: type === 'leave' ? String(data.get('type') || '') : '',
        createdAt: new Date().toISOString()
      };
      requests.push(request);
      if (!writeRequests(requests)) {
        message.textContent = 'Could not save this preview request in the browser. Check storage and try again.';
        message.classList.add('is-error');
        return;
      }
      form.reset();
      message.textContent = 'Request saved on this device for preview only. It has not been sent to your manager.';
      message.classList.remove('is-error');
      renderRequests(type);
    });
  }

  setupRequestForm('#leave-request-form', 'leave');
  setupRequestForm('#wfh-request-form', 'wfh');

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
      if (methodDetail) methodDetail.textContent = methodCopy[selectedMethod];
      if (locationButton) {
        locationButton.hidden = selectedMethod !== 'location';
        locationButton.disabled = false;
        locationButton.textContent = 'Check my location';
      }
      setMessage('');
      renderAttendance();
    });
  });

  if (locationButton) {
    locationButton.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        setMessage('Location is not supported by this browser. Choose Office Wi-Fi preview instead.', true);
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
          if (methodDetail) methodDetail.textContent = `Location permission granted (about ${accuracy} m accuracy). This preview does not check an office boundary or send/save your coordinates.`;
          locationButton.textContent = 'Location checked';
          locationButton.disabled = false;
          renderAttendance();
        },
        (error) => {
          locationChecked = false;
          const errorMessage = error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Allow it in your browser settings or choose another method.'
            : 'Could not get your location. Check your settings and try again, or choose another method.';
          if (methodDetail) methodDetail.textContent = errorMessage;
          locationButton.textContent = 'Try location again';
          locationButton.disabled = false;
          renderAttendance();
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  if (actionButton) {
    actionButton.addEventListener('click', () => {
      if (selectedMethod === 'face') return;
      if (selectedMethod === 'location' && !locationChecked) {
        setMessage('Check your location first, or choose Office Wi-Fi preview.', true);
        return;
      }
      const record = readAttendance() || { businessDate: localDateKey(), clockInAt: null, clockOutAt: null, methods: {} };
      if (!record.clockInAt) {
        record.clockInAt = new Date().toISOString();
        record.methods.clockIn = selectedMethod;
      } else if (!record.clockOutAt) {
        record.clockOutAt = new Date().toISOString();
        record.methods.clockOut = selectedMethod;
      } else return;
      if (!writeAttendance(record)) {
        setMessage('Could not save this preview action in the browser. Check storage and try again.', true);
        return;
      }
      const label = record.clockOutAt ? 'Clock-out' : 'Clock-in';
      setMessage(`${label} added to this device's preview only. It has not been sent to a server.`);
      locationChecked = false;
      if (selectedMethod === 'location' && locationButton) {
        locationButton.textContent = 'Check my location';
        if (methodDetail) methodDetail.textContent = methodCopy.location;
      }
      renderAttendance();
    });
  }

  window.addEventListener('storage', (event) => {
    if (event.key === ATTENDANCE_KEY) renderAttendance();
    if (event.key === REQUESTS_KEY) {
      renderRequests('leave');
      renderRequests('wfh');
    }
  });

  updateClock();
  window.setInterval(updateClock, 1000);
  renderAttendance();
  renderRequests('leave');
  renderRequests('wfh');
  showPage('menu');

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((error) => {
        console.info('Offline page caching is unavailable.', error);
      });
    });
  }
})();

(() => {
  'use strict';

  const form = document.querySelector('#employee-login-form');
  const gate = document.querySelector('#employee-login');
  const app = document.querySelector('#employee-app');

  if (!form || !gate || !app) return;

  const button = document.querySelector('#employee-login-submit');
  const message = document.querySelector('#employee-login-message');
  const sessionMessage = document.querySelector('#employee-session-message');

  let token = '';
  let employee = null;
  let attendance = null;
  let methods = [];
  let businessDate = '';
  let timeZone = 'UTC';
  let ready = false;
  let base = '';

  let expiryTimer;
  let pollTimer;

  let generation = 0;
  let controller = new AbortController();

  let checking = false;
  let loginBusy = false;

  function emit(name) {
    window.dispatchEvent(
      new CustomEvent(`peopledesk:${name}`)
    );
  }

  function showMessage(target, text, error = false) {
    target.textContent = text;
    target.dataset.error = String(error);
  }

  function logout(text = 'Signed out.', error = false) {
    generation += 1;

    controller.abort();
    controller = new AbortController();

    clearTimeout(expiryTimer);
    clearInterval(pollTimer);

    token = '';
    employee = null;
    attendance = null;
    methods = [];
    businessDate = '';
    ready = false;
    checking = false;
    loginBusy = false;

    form.elements.password.value = '';
    button.disabled = false;

    app.hidden = true;
    gate.hidden = false;

    showMessage(message, text, error);
    showMessage(sessionMessage, '');

    document.title = 'Employee sign-in · PeopleDesk';

    emit('session');
  }

  function configuredOrigin() {
    if (location.protocol === 'file:') {
      throw new Error(
        'Open this page through your frontend HTTP server, not file://.'
      );
    }

    const url = new URL(
      window.HRMS_CONFIG?.apiBaseUrl ||
      'http://localhost:3000'
    );

    const local = [
      'localhost',
      '127.0.0.1',
      '[::1]'
    ].includes(url.hostname);

    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/' ||
      (
        url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && local)
      )
    ) {
      throw new Error(
        'Ask your administrator to configure a trusted HTTPS API origin ' +
        'in hrms-config.js. Local development may use http://localhost:3000.'
      );
    }

    return url.origin;
  }

  async function request(path, options = {}) {
    const stamp = generation;
    const authenticated = Boolean(token);

    const headers = {
      ...(options.body
        ? { 'Content-Type': 'application/json' }
        : {})
    };

    if (authenticated) {
      headers.Authorization = 'Bearer ' + token;
    }

    let response;

    try {
      response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (error) {
      if (
        error.name === 'AbortError' ||
        stamp !== generation
      ) {
        throw new DOMException(
          'Session changed.',
          'AbortError'
        );
      }

      throw new Error(
        'Cannot reach the backend. Check your connection, ' +
        'the backend server and its configured CORS origin. ' +
        'Offline clocking is not available.'
      );
    }

    const data = await response.json().catch(() => ({}));

    if (stamp !== generation) {
      throw new DOMException(
        'Session changed.',
        'AbortError'
      );
    }

    if (authenticated && response.status === 401) {
      logout(
        'Your session expired or this account was disabled. ' +
        'Sign in again or contact HR.',
        true
      );

      throw new DOMException(
        'Session ended.',
        'AbortError'
      );
    }

    if (!response.ok) {
      const error = new Error(
        data.error ||
        `Request failed (${response.status}).`
      );

      error.status = response.status;
      error.data = data;

      throw error;
    }

    return data;
  }

  async function checkSession() {
    if (!token || !employee) {
      throw new Error('Sign in to continue.');
    }

    const current = await request('/v1/me');

    if (current.id !== employee.id) {
      logout(
        'The signed-in account changed. Sign in again.',
        true
      );

      throw new DOMException(
        'Session changed.',
        'AbortError'
      );
    }

    employee = current;

    return current;
  }

  async function refreshAttendance() {
    if (!token || !employee) {
      throw new Error('Sign in to continue.');
    }

    ready = false;
    emit('attendance');

    const data = await request('/v1/attendance/today');

    attendance = data.attendance || null;
    businessDate = data.businessDate;
    timeZone = data.timeZone || 'UTC';
    ready = true;

    emit('attendance');

    return attendance;
  }

  async function refresh() {
    await checkSession();

    const data = await request('/v1/clocking/methods');

    if (!Array.isArray(data.methods)) {
      throw new Error(
        'The backend returned an invalid clocking-method list.'
      );
    }

    methods = data.methods;

    await refreshAttendance();

    showMessage(sessionMessage, '');
  }

  async function locationDetails() {
    if (
      !window.isSecureContext ||
      !navigator.geolocation
    ) {
      throw new Error(
        'Location clocking requires a secure page and browser location support.'
      );
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy
        }),

        () => reject(new Error(
          'Location access was denied or unavailable. ' +
          'Allow it in your browser or use another approved method.'
        )),

        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }

  async function clock(method) {
    const stamp = generation;

    if (!token || !employee) {
      throw new Error('Sign in to continue.');
    }

    if (
      !methods.some((item) => (
        item.id === method && item.enabled
      ))
    ) {
      throw new Error(
        'Choose an enabled clocking method.'
      );
    }

    if (!ready || !businessDate) {
      throw new Error(
        'Refresh attendance before clocking.'
      );
    }

    if (attendance?.clockOutAt) {
      throw new Error(
        'Your shift is already complete for this business day.'
      );
    }

    // Preserve the action the employee actually clicked.
    // A stale Clock in must never automatically become Clock out.
    const action = attendance?.clockInAt
      ? 'clock-out'
      : 'clock-in';

    const expectedDate = businessDate;
    const expectedRecordId = attendance?.id || null;

    await refreshAttendance();

    const currentAction = attendance?.clockOutAt
      ? 'complete'
      : attendance?.clockInAt
        ? 'clock-out'
        : 'clock-in';

    if (
      businessDate !== expectedDate ||
      currentAction !== action ||
      (
        action === 'clock-out' &&
        attendance?.id !== expectedRecordId
      )
    ) {
      throw new Error(
        'Attendance changed since this screen was loaded. ' +
        'Review the updated status and tap the action again if needed.'
      );
    }

    const body = { method };

    if (method === 'location') {
      body.location = await locationDetails();
    }

    if (stamp !== generation || !token) {
      throw new DOMException(
        'Session changed.',
        'AbortError'
      );
    }

    try {
      const data = await request(
        `/v1/attendance/${action}`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      attendance = data.attendance;
      businessDate = data.businessDate;
      timeZone = data.timeZone || timeZone;
      ready = true;

      emit('attendance');

      return action;
    } catch (error) {
      if (
        error.status === 409 &&
        error.data &&
        'attendance' in error.data
      ) {
        attendance = error.data.attendance;

        businessDate =
          error.data.businessDate || businessDate;

        emit('attendance');
      }

      throw error;
    }
  }

  // The access token remains private inside this closure.
  window.PeopleDeskSession = Object.freeze({
    get employee() {
      return employee;
    },

    get attendance() {
      return attendance;
    },

    get methods() {
      return methods;
    },

    get businessDate() {
      return businessDate;
    },

    get timeZone() {
      return timeZone;
    },

    get ready() {
      return ready;
    },

    checkSession,
    refresh,
    clock,
    logout
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (loginBusy) return;

    loginBusy = true;
    button.disabled = true;

    showMessage(message, 'Signing in…');

    try {
      base = configuredOrigin();

      const data = await request('/v1/auth/login', {
        method: 'POST',

        body: JSON.stringify({
          loginId: form.elements.loginId.value.trim(),
          password: form.elements.password.value
        })
      });

      if (!data.accessToken || !data.employee?.id) {
        throw new Error(
          'Invalid sign-in response from the backend.'
        );
      }

      token = data.accessToken;
      employee = data.employee;

      const seconds = Number(data.expiresIn);

      const lifetime =
        Number.isFinite(seconds) && seconds > 0
          ? Math.min(seconds, 900)
          : 900;

      expiryTimer = setTimeout(() => {
        logout(
          'Your session expired. Sign in again.',
          true
        );
      }, lifetime * 1000);

      await refresh();

      emit('session');

      gate.hidden = true;
      app.hidden = false;

      showMessage(message, '');

      pollTimer = setInterval(async () => {
        if (
          document.hidden ||
          checking ||
          !token
        ) {
          return;
        }

        checking = true;

        try {
          await checkSession();
        } catch (error) {
          if (error.name !== 'AbortError') {
            showMessage(
              sessionMessage,
              error.message,
              true
            );
          }
        } finally {
          checking = false;
        }
      }, 30000);
    } catch (error) {
      if (error.name !== 'AbortError') {
        logout(error.message, true);
      }
    } finally {
      form.elements.password.value = '';
      loginBusy = false;
      button.disabled = false;
    }
  });

  document.querySelector('#employee-signout')
    .addEventListener('click', () => logout());

  document.addEventListener(
    'visibilitychange',
    async () => {
      if (
        !document.hidden &&
        token &&
        employee &&
        !checking
      ) {
        checking = true;

        try {
          await checkSession();
        } catch (error) {
          if (error.name !== 'AbortError') {
            showMessage(
              sessionMessage,
              error.message,
              true
            );
          }
        } finally {
          checking = false;
        }
      }
    }
  );

  window.addEventListener('pagehide', () => {
    logout('Sign in to continue.');
  });
})();

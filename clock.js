(() => {
  'use strict';

  const REQUESTS_KEY = 'peopledesk-employee-requests-demo-v1';

  const timeEl = document.querySelector('#live-time');
  const dateEl = document.querySelector('#live-date');
  const statusEl = document.querySelector('#shift-status');

  const clockInEl = document.querySelector('#clock-in-value');
  const clockOutEl = document.querySelector('#clock-out-value');

  const actionButton = document.querySelector('#clock-action');
  const actionMessage = document.querySelector('#action-message');

  const methodSelect = document.querySelector('#clock-method');
  const methodNote = document.querySelector('#clock-method-note');
  const clockRefresh = document.querySelector('#clock-refresh');

  const session = window.PeopleDeskSession;

  let selectedMethod = '';
  let clockBusy = false;

  let pagePanels = [];
  let menuLinks = [];
  let navItems = [];

  function readAttendance() {
    return session?.employee
      ? session.attendance
      : null;
  }

  function requestsKey() {
    return session?.employee
      ? `${REQUESTS_KEY}:${session.employee.id}`
      : null;
  }

  function displayTime(iso) {
    if (!iso) return '—';

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(iso));
  }

  function formatDuration(seconds) {
    const safeSeconds = Math.max(
      0,
      Math.floor(seconds)
    );

    const hours = String(
      Math.floor(safeSeconds / 3600)
    ).padStart(2, '0');

    const minutes = String(
      Math.floor((safeSeconds % 3600) / 60)
    ).padStart(2, '0');

    const remaining = String(
      safeSeconds % 60
    ).padStart(2, '0');

    return `${hours}:${minutes}:${remaining}`;
  }

  function updateWorkHours() {
    const timer = document.querySelector(
      '#dashboard-work-hours'
    );

    if (!timer) return;

    const record = readAttendance();

    if (!record?.clockInAt || record.clockOutAt) {
      timer.textContent = record?.clockOutAt
        ? formatDuration(
            (
              new Date(record.clockOutAt) -
              new Date(record.clockInAt)
            ) / 1000
          )
        : '00:00:00';

      return;
    }

    timer.textContent = formatDuration(
      (
        Date.now() -
        new Date(record.clockInAt).getTime()
      ) / 1000
    );
  }

  function updateClock() {
    const now = new Date();

    const timeText = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);

    const dateText = new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(now);

    if (timeEl) timeEl.textContent = timeText;
    if (dateEl) dateEl.textContent = dateText;

    const homeTime = document.querySelector('#dashboard-time');
    const homeDate = document.querySelector('#dashboard-date');

    if (homeTime) homeTime.textContent = timeText;
    if (homeDate) homeDate.textContent = dateText;

    updateWorkHours();
  }

  function renderAttendance() {
    const record = readAttendance();

    const enabledMethods =
      session?.methods.filter((method) => method.enabled) ||
      [];

    if (
      !enabledMethods.some((method) => (
        method.id === selectedMethod
      ))
    ) {
      selectedMethod = enabledMethods[0]?.id || '';
    }

    if (methodSelect) {
      methodSelect.replaceChildren();

      if (!enabledMethods.length) {
        const option = document.createElement('option');

        option.value = '';
        option.textContent = 'No approved method configured';

        methodSelect.append(option);
      }

      for (const method of enabledMethods) {
        const option = document.createElement('option');

        option.value = method.id;

        option.textContent =
          method.id === 'wifi'
            ? 'Approved office network'
            : method.id === 'location'
              ? 'Location'
              : method.id;

        methodSelect.append(option);
      }

      methodSelect.value = selectedMethod;

      methodSelect.disabled =
        clockBusy || !session?.ready;
    }

    if (methodNote) {
      methodNote.textContent =
        enabledMethods.find((method) => (
          method.id === selectedMethod
        ))?.note ||
        'Ask HR to configure an approved office network ' +
        'or location boundary on the backend.';
    }

    const date = document.querySelector(
      '#clock-business-date'
    );

    if (date) {
      date.textContent = session?.businessDate
        ? `Business day: ${session.businessDate} · ${session.timeZone}`
        : '';
    }

    if (clockInEl) {
      clockInEl.textContent = displayTime(
        record?.clockInAt
      );
    }

    if (clockOutEl) {
      clockOutEl.textContent = displayTime(
        record?.clockOutAt
      );
    }

    if (statusEl && actionButton) {
      statusEl.classList.remove(
        'is-working',
        'is-done'
      );

      statusEl.textContent = record?.clockOutAt
        ? 'Shift complete'
        : record?.clockInAt
          ? 'On shift'
          : 'Not clocked in';

      statusEl.classList.toggle(
        'is-working',
        Boolean(record?.clockInAt && !record.clockOutAt)
      );

      statusEl.classList.toggle(
        'is-done',
        Boolean(record?.clockOutAt)
      );

      actionButton.textContent = clockBusy
        ? 'Saving…'
        : record?.clockOutAt
          ? 'Shift complete'
          : record?.clockInAt
            ? 'Clock out'
            : 'Clock in';

      actionButton.disabled =
        clockBusy ||
        !session?.ready ||
        !selectedMethod ||
        Boolean(record?.clockOutAt);
    }

    if (clockRefresh) {
      clockRefresh.disabled = clockBusy;
    }

    const homeIn = document.querySelector(
      '#dashboard-clock-in'
    );

    const homeStatus = document.querySelector(
      '#dashboard-attendance-status'
    );

    if (homeIn) {
      homeIn.textContent = record?.clockInAt
        ? displayTime(record.clockInAt)
        : 'Not clocked in';
    }

    if (homeStatus) {
      homeStatus.textContent = record?.clockOutAt
        ? 'Shift complete'
        : record?.clockInAt
          ? 'Working'
          : 'Not started';

      homeStatus.classList.toggle(
        'is-working',
        Boolean(record?.clockInAt && !record.clockOutAt)
      );
    }

    updateWorkHours();
  }

  function setMessage(message, isError = false) {
    if (!actionMessage) return;

    actionMessage.textContent = message;

    actionMessage.classList.toggle(
      'is-error',
      isError
    );
  }

  // --------------------------------------------------
  // Employee dashboard styles
  // --------------------------------------------------

  function addHomeStyles() {
    const style = document.createElement('style');

    style.textContent = `
      .employee-home {
        padding-bottom: 12px;
      }

      .home-welcome {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin: 4px 0 20px;
      }

      .home-welcome .eyebrow {
        margin-bottom: 5px;
      }

      .home-welcome h1 {
        margin: 0;
        font: 700 28px Manrope, sans-serif;
        letter-spacing: -.8px;
      }

      .home-role {
        margin: 5px 0 0;
        color: #788198;
        font-size: 13px;
      }

      .home-avatar {
        display: grid;
        width: 54px;
        height: 54px;
        flex: none;
        place-items: center;
        border-radius: 18px;
        background: #eeeaff;
        color: #6654d9;
        font-size: 17px;
        font-weight: 700;
      }

      .home-attendance-card {
        padding: 18px;
        margin: 0 0 13px;
        border: 1px solid #e7eaf2;
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 8px 26px rgba(37,43,59,.04);
      }

      .home-attendance-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .home-attendance-top h2,
      .home-section-heading h2 {
        margin: 0;
        font: 700 16px Manrope, sans-serif;
      }

      .home-attendance-top .eyebrow {
        margin-bottom: 5px;
      }

      .home-time-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 16px 0 13px;
      }

      .home-time-item {
        padding: 12px;
        border-radius: 11px;
        background: #f8f9fc;
      }

      .home-time-item small,
      .home-time-item strong {
        display: block;
      }

      .home-time-item small {
        color: #788198;
        font-size: 11px;
      }

      .home-time-item strong {
        margin-top: 5px;
        color: #252b3b;
        font: 700 17px Manrope, sans-serif;
      }

      .home-working-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 0 14px;
        border-top: 1px solid #edf0f5;
      }

      .home-working-row span {
        color: #788198;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .6px;
      }

      .home-working-row strong {
        color: #252b3b;
        font: 700 18px Manrope, sans-serif;
        font-variant-numeric: tabular-nums;
      }

      .home-status {
        padding: 6px 9px;
        border-radius: 999px;
        background: #f1f2f6;
        color: #70798e;
        font-size: 10px;
        font-weight: 700;
        white-space: nowrap;
      }

      .home-status.is-working {
        background: #e6f6ef;
        color: #247b5d;
      }

      .home-primary-action {
        width: 100%;
        min-height: 46px;
        border: 0;
        border-radius: 11px;
        background: #6956e8;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .home-primary-action:hover {
        background: #5846d1;
      }

      .home-example-note {
        margin: 8px 0 0;
        color: #8991a5;
        font-size: 10px;
        text-align: center;
      }

      .home-leave-card {
        padding: 17px;
        margin-bottom: 21px;
        border: 1px solid #e7eaf2;
        border-radius: 15px;
        background: #fff;
        box-shadow: 0 8px 26px rgba(37,43,59,.035);
      }

      .home-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 13px;
      }

      .home-section-heading .eyebrow {
        margin-bottom: 4px;
      }

      .home-leave-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }

      .home-leave-balance {
        padding: 11px 9px;
        border-radius: 10px;
        background: #f8f7ff;
      }

      .home-leave-balance strong {
        display: block;
        color: #282e40;
        font: 700 21px Manrope, sans-serif;
      }

      .home-leave-balance span {
        display: block;
        margin-top: 3px;
        color: #788198;
        font-size: 10px;
      }

      .home-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .home-action {
        min-height: 86px;
        display: grid;
        grid-template-columns: 36px 1fr;
        align-content: center;
        align-items: center;
        gap: 3px 10px;
        padding: 12px;
        border: 1px solid #e7eaf2;
        border-radius: 12px;
        background: #fff;
        color: #252b3b;
        text-align: left;
        box-shadow: 0 5px 18px rgba(37,43,59,.025);
        cursor: pointer;
      }

      .home-action:hover {
        border-color: #cfc8ff;
        background: #fcfbff;
      }

      .home-action-icon {
        grid-row: span 2;
        display: grid;
        width: 36px;
        height: 36px;
        place-items: center;
        border-radius: 11px;
        background: #f0edff;
        color: #6654d9;
        font-size: 18px;
      }

      .home-action strong {
        font: 700 12px Manrope, sans-serif;
      }

      .home-action small {
        color: #788198;
        font-size: 10px;
        line-height: 1.35;
      }

      .home-notification {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 14px;
        margin-top: 18px;
        border: 1px solid #e7eaf2;
        border-radius: 12px;
        background: #fff;
      }

      .home-notification-icon {
        display: grid;
        width: 35px;
        height: 35px;
        flex: none;
        place-items: center;
        border-radius: 11px;
        background: #fff3e7;
        color: #b27634;
        font-size: 17px;
      }

      .home-notification-copy {
        min-width: 0;
        flex: 1;
      }

      .home-notification-copy strong,
      .home-notification-copy small {
        display: block;
      }

      .home-notification-copy strong {
        font-size: 12px;
      }

      .home-notification-copy small {
        margin-top: 3px;
        color: #788198;
        font-size: 10px;
        line-height: 1.4;
      }

      .home-notification button {
        padding: 6px 8px;
        border: 0;
        border-radius: 7px;
        background: #f3f1ff;
        color: #5e50cf;
        font-size: 10px;
        font-weight: 700;
        cursor: pointer;
      }

      .services-back {
        margin-bottom: 13px;
        padding: 7px 10px;
        border: 1px solid #e3e6ef;
        border-radius: 8px;
        background: #fff;
        color: #5547c4;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }

      @media (max-width: 420px) {
        .home-actions {
          grid-template-columns: 1fr;
        }

        .home-working-row strong {
          font-size: 16px;
        }
      }
    `;

    document.head.append(style);
  }

  // --------------------------------------------------
  // Build employee home and services menu
  // --------------------------------------------------

  function installEmployeeDashboard() {
    const home = document.querySelector('#page-menu');

    if (!home) return;

    const services = document.createElement('section');

    services.className = 'employee-page menu-page';
    services.id = 'page-services';
    services.dataset.pagePanel = '';

    services.setAttribute(
      'aria-labelledby',
      'page-title-services'
    );

    services.hidden = true;

    services.innerHTML = `
      <button
        type="button"
        class="services-back"
        data-page-link="menu"
      >
        ← Home
      </button>

      <div class="page-intro">
        <p class="eyebrow">EMPLOYEE SELF-SERVICE</p>
        <h1 id="page-title-services">Services</h1>
        <p class="intro">Choose an option to continue.</p>
      </div>

      <nav class="menu-grid" aria-label="Employee services">
        <button
          type="button"
          class="menu-card"
          data-page-link="attendance"
        >
          <span
            class="menu-card-icon attendance-menu-icon"
            aria-hidden="true"
          >◷</span>

          <span class="menu-card-copy">
            <strong>Attendance</strong>
            <small>Clock in/out and view today’s shift</small>
          </span>

          <span class="menu-card-arrow" aria-hidden="true">
            →
          </span>
        </button>

        <button
          type="button"
          class="menu-card"
          data-page-link="leave"
        >
          <span
            class="menu-card-icon leave-menu-icon"
            aria-hidden="true"
          >▤</span>

          <span class="menu-card-copy">
            <strong>Issue leave</strong>
            <small>Submit a leave request for review</small>
          </span>

          <span class="menu-card-arrow" aria-hidden="true">
            →
          </span>
        </button>

        <button
          type="button"
          class="menu-card"
          data-page-link="wfh"
        >
          <span
            class="menu-card-icon wfh-menu-icon"
            aria-hidden="true"
          >⌂</span>

          <span class="menu-card-copy">
            <strong>Request WFH</strong>
            <small>Ask to work from home on selected dates</small>
          </span>

          <span class="menu-card-arrow" aria-hidden="true">
            →
          </span>
        </button>

        <button
          type="button"
          class="menu-card"
          data-page-link="about"
        >
          <span
            class="menu-card-icon about-menu-icon"
            aria-hidden="true"
          >ⓘ</span>

          <span class="menu-card-copy">
            <strong>About</strong>
            <small>Learn about this employee app preview</small>
          </span>

          <span class="menu-card-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </nav>
    `;

    home.classList.remove('menu-page');
    home.classList.add('employee-home');

    home.innerHTML = `
      <div class="home-welcome">
        <div>
          <p class="eyebrow">GOOD MORNING</p>
          <h1>Employee</h1>
          <p class="home-role"></p>
        </div>

        <span class="home-avatar" aria-label="Employee">
          E
        </span>
      </div>

      <section
        class="home-attendance-card"
        aria-labelledby="home-attendance-title"
      >
        <div class="home-attendance-top">
          <div>
            <p class="eyebrow">TODAY</p>

            <h2 id="home-attendance-title">
              Today's attendance
            </h2>
          </div>

          <span
            id="dashboard-attendance-status"
            class="home-status"
          >
            Not started
          </span>
        </div>

        <div class="home-time-summary">
          <div class="home-time-item">
            <small>Clock in</small>

            <strong id="dashboard-clock-in">
              Not clocked in
            </strong>
          </div>

          <div class="home-time-item">
            <small>Current time</small>

            <strong id="dashboard-time">
              --:--
            </strong>
          </div>
        </div>

        <div class="home-working-row">
          <span>WORKING HOURS</span>

          <strong id="dashboard-work-hours">
            00:00:00
          </strong>
        </div>

        <button
          type="button"
          class="home-primary-action"
          data-page-link="attendance"
        >
          Open attendance
        </button>

        <p class="home-example-note">
          Clock records are validated and stored by the backend
        </p>
      </section>

      <section
        class="home-leave-card"
        aria-labelledby="home-leave-title"
      >
        <div class="home-section-heading">
          <div>
            <p class="eyebrow">TIME OFF</p>
            <h2 id="home-leave-title">My leave balance</h2>
          </div>
        </div>

        <div class="home-leave-grid">
          <div class="home-leave-balance">
            <strong>12</strong>
            <span>Annual</span>
          </div>

          <div class="home-leave-balance">
            <strong>14</strong>
            <span>Medical</span>
          </div>

          <div class="home-leave-balance">
            <strong>3</strong>
            <span>Emergency</span>
          </div>
        </div>

        <p class="home-example-note">
          Illustrative sample balances · not connected to employee records
        </p>
      </section>

      <section aria-labelledby="home-quick-title">
        <div class="home-section-heading">
          <div>
            <p class="eyebrow">GET THINGS DONE</p>
            <h2 id="home-quick-title">Quick actions</h2>
          </div>
        </div>

        <div class="home-actions">
          <button
            type="button"
            class="home-action"
            data-page-link="attendance"
          >
            <span class="home-action-icon" aria-hidden="true">
              ◷
            </span>

            <strong>Attendance</strong>
            <small>Clock in / out</small>
          </button>

          <button
            type="button"
            class="home-action"
            data-page-link="leave"
          >
            <span class="home-action-icon" aria-hidden="true">
              ▤
            </span>

            <strong>Apply Leave</strong>
            <small>Request time off</small>
          </button>

          <button
            type="button"
            class="home-action"
            data-page-link="wfh"
          >
            <span class="home-action-icon" aria-hidden="true">
              ⌂
            </span>

            <strong>Request WFH</strong>
            <small>Work arrangement</small>
          </button>

          <button
            type="button"
            class="home-action"
            data-page-link="about"
          >
            <span class="home-action-icon" aria-hidden="true">
              ⓘ
            </span>

            <strong>Notifications</strong>
            <small>View updates</small>
          </button>
        </div>
      </section>

      <aside
        class="home-notification"
        aria-label="Notifications"
      >
        <span
          class="home-notification-icon"
          aria-hidden="true"
        >
          ♧
        </span>

        <span class="home-notification-copy">
          <strong>Notifications</strong>
          <small>No new updates in this demo.</small>
        </span>

        <button type="button" data-page-link="about">
          View updates
        </button>
      </aside>
    `;

    home.after(services);

    const topMenuButton = document.querySelector(
      '#menu-home-button'
    );

    if (topMenuButton) {
      topMenuButton.textContent = 'Menu';
      topMenuButton.dataset.pageLink = 'services';

      topMenuButton.setAttribute(
        'aria-label',
        'Open employee services menu'
      );
    }

    const homeNavItem = document.querySelector(
      '.employee-nav-item[data-page-link="menu"]'
    );

    if (homeNavItem) {
      const label = homeNavItem.querySelector('small');

      if (label) {
        label.textContent = 'Home';
      }
    }

    addHomeStyles();
  }

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  function showPage(pageName) {
    const target = document.querySelector(
      `#page-${pageName}`
    );

    if (!target) return;

    pagePanels.forEach((panel) => {
      panel.hidden = panel !== target;
    });

    navItems.forEach((item) => {
      const active =
        item.dataset.pageLink === pageName;

      item.classList.toggle('active', active);

      if (active) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    const titles = {
      menu: 'Home',
      services: 'Services',
      attendance: 'Attendance',
      leave: 'Issue leave',
      wfh: 'Request WFH',
      about: 'About'
    };

    document.title =
      `${titles[pageName] || 'Employee app'} · PeopleDesk`;

    if (pageName === 'leave') {
      renderRequests('leave');
    }

    if (pageName === 'wfh') {
      renderRequests('wfh');
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function installNavigation() {
    pagePanels = [
      ...document.querySelectorAll('[data-page-panel]')
    ];

    menuLinks = [
      ...document.querySelectorAll('[data-page-link]')
    ];

    navItems = [
      ...document.querySelectorAll('.employee-nav-item')
    ];

    menuLinks.forEach((link) => {
      link.addEventListener('click', () => {
        showPage(link.dataset.pageLink);
      });
    });
  }

  // --------------------------------------------------
  // Local leave / WFH previews
  // --------------------------------------------------

  function readRequests() {
    try {
      const key = requestsKey();

      if (!key) return [];

      const list = JSON.parse(
        localStorage.getItem(key) || '[]'
      );

      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.warn(
        'Could not read local demo requests.',
        error
      );

      return [];
    }
  }

  function writeRequests(requests) {
    try {
      const key = requestsKey();

      if (!key) return false;

      localStorage.setItem(
        key,
        JSON.stringify(requests)
      );

      return true;
    } catch (error) {
      console.error(
        'Could not save local demo requests.',
        error
      );

      return false;
    }
  }

  function renderRequests(type) {
    const target = document.querySelector(
      type === 'leave'
        ? '#leave-request-list'
        : '#wfh-request-list'
    );

    if (!target) return;

    const items = readRequests()
      .filter((item) => item.type === type)
      .slice()
      .reverse();

    target.replaceChildren();

    if (!items.length) {
      const empty = document.createElement('p');

      empty.className = 'request-empty';

      empty.textContent =
        'No requests saved on this device yet.';

      target.append(empty);

      return;
    }

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'request-item';

      const title = document.createElement('strong');

      title.textContent = type === 'leave'
        ? item.leaveType
        : 'Work from home';

      const dates = document.createElement('span');

      dates.textContent =
        item.startDate === item.endDate
          ? item.startDate
          : `${item.startDate} – ${item.endDate}`;

      const reason = document.createElement('p');
      reason.textContent = item.reason;

      const state = document.createElement('small');

      state.textContent =
        'Saved locally · not submitted to backend';

      card.append(
        title,
        dates,
        reason,
        state
      );

      target.append(card);
    });
  }

  function setupRequestForm(formId, type) {
    const form = document.querySelector(formId);

    if (!form) return;

    const message = form.querySelector('.form-message');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const accountId = session?.employee?.id;

      if (!accountId) return;

      try {
        await session.checkSession();
      } catch (error) {
        if (error.name !== 'AbortError') {
          message.textContent = error.message;
          message.classList.add('is-error');
        }

        return;
      }

      if (session.employee?.id !== accountId) {
        return;
      }

      const data = new FormData(form);

      const startDate = String(
        data.get('startDate') || ''
      );

      const endDate = String(
        data.get('endDate') || ''
      );

      if (endDate < startDate) {
        message.textContent =
          'The end date must be on or after the start date.';

        message.classList.add('is-error');

        form.elements.endDate.focus();

        return;
      }

      const requests = readRequests();

      requests.push({
        id:
          window.crypto?.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,

        type,
        startDate,
        endDate,

        reason: String(
          data.get('reason') || ''
        ).trim(),

        leaveType: type === 'leave'
          ? String(data.get('type') || '')
          : '',

        createdAt: new Date().toISOString()
      });

      if (!writeRequests(requests)) {
        message.textContent =
          'Could not save this preview request in the browser. ' +
          'Check storage and try again.';

        message.classList.add('is-error');

        return;
      }

      form.reset();

      message.textContent =
        'Request saved on this device for preview only. ' +
        'It has not been sent to your manager.';

      message.classList.remove('is-error');

      renderRequests(type);
    });
  }

  // --------------------------------------------------
  // Server-backed attendance actions
  // --------------------------------------------------

  function setupMethodSelection() {
    methodSelect?.addEventListener('change', () => {
      selectedMethod = methodSelect.value;

      setMessage('');
      renderAttendance();
    });

    clockRefresh?.addEventListener('click', async () => {
      if (clockBusy || !session?.employee) return;

      clockBusy = true;
      renderAttendance();

      try {
        await session.refresh();

        setMessage(
          'Attendance refreshed from the backend.'
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message, true);
        }
      } finally {
        clockBusy = false;
        renderAttendance();
      }
    });

    actionButton?.addEventListener('click', async () => {
      if (clockBusy || !session?.employee) return;

      clockBusy = true;
      renderAttendance();

      setMessage('Saving to the backend…');

      try {
        const action = await session.clock(
          selectedMethod
        );

        setMessage(
          `${action === 'clock-in' ? 'Clock-in' : 'Clock-out'} saved by the server.`
        );
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message, true);
        }
      } finally {
        clockBusy = false;
        renderAttendance();
      }
    });
  }

  // --------------------------------------------------
  // Signed-in employee identity
  // --------------------------------------------------

  function updateAccountUI() {
    const employee = session?.employee;

    const name =
      employee?.displayName || 'Employee';

    const loginId =
      employee?.loginId ||
      employee?.email ||
      '';

    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();

    const identity = document.querySelector(
      '#employee-name'
    );

    const userId = document.querySelector(
      '#employee-user-id'
    );

    if (identity) {
      identity.textContent = name;
    }

    if (userId) {
      userId.textContent = loginId;
    }

    const welcome = document.querySelector(
      '#page-menu .home-welcome h1'
    );

    if (welcome) {
      welcome.textContent = name;
    }

    const role = document.querySelector(
      '#page-menu .home-role'
    );

    if (role) {
      role.textContent = employee
        ? `User ID: ${loginId}`
        : '';
    }

    for (
      const avatar of document.querySelectorAll(
        '.home-avatar, .employee-avatar'
      )
    ) {
      avatar.textContent = initials;
      avatar.setAttribute('aria-label', name);
    }

    selectedMethod = '';
    clockBusy = false;

    for (
      const form of document.querySelectorAll(
        '.request-card'
      )
    ) {
      form.reset();
    }

    for (
      const message of document.querySelectorAll(
        '.form-message'
      )
    ) {
      message.textContent = '';
    }

    setMessage('');

    renderAttendance();
    renderRequests('leave');
    renderRequests('wfh');

    showPage('menu');

    if (!employee) {
      document.title = 'Employee sign-in · PeopleDesk';
    }
  }

  // --------------------------------------------------
  // Initialize
  // --------------------------------------------------

  installEmployeeDashboard();
  installNavigation();

  setupRequestForm('#leave-request-form', 'leave');
  setupRequestForm('#wfh-request-form', 'wfh');

  setupMethodSelection();

  window.addEventListener(
    'peopledesk:session',
    updateAccountUI
  );

  window.addEventListener(
    'peopledesk:attendance',
    renderAttendance
  );

  window.addEventListener('storage', (event) => {
    if (event.key === requestsKey()) {
      renderRequests('leave');
      renderRequests('wfh');
    }
  });

  updateClock();

  window.setInterval(updateClock, 1000);

  renderAttendance();
  renderRequests('leave');
  renderRequests('wfh');
  updateAccountUI();

  if (
    'serviceWorker' in navigator &&
    location.protocol.startsWith('http')
  ) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js')
        .catch((error) => {
          console.info(
            'Offline page caching is unavailable.',
            error
          );
        });
    });
  }
})();

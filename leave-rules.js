/* PeopleDesk leave rules. Local prototype, not a statutory policy engine. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LeaveRules = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPES = Object.freeze({
    annual: 'Annual leave',
    medical: 'Medical leave',
    emergency: 'Emergency leave'
  });

  const DEFAULTS = Object.freeze({
    annual: 14,
    medical: 14,
    emergency: 3
  });

  const STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
  const DAY = 86400000;

  const fail = (message) => {
    throw new Error(message);
  };

  const own = (object, key) => Object.hasOwn(object, key);

  function parseDate(value) {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      fail('Choose a date in YYYY-MM-DD format.');
    }

    const [y, m, d] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));

    if (
      y < 1900 ||
      y > 9999 ||
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) {
      fail('Choose a valid calendar date (1900–9999).');
    }

    return date;
  }

  const isoDate = (date) => date.toISOString().slice(0, 10);

  const isWeekday = (value) => {
    const day = parseDate(value).getUTCDay();
    return day !== 0 && day !== 6;
  };

  function dayUnits(start, end, duration = 'full', holidays = {}) {
    const first = parseDate(start);
    const last = parseDate(end);

    if (last < first) {
      fail('End date cannot be earlier than start date.');
    }

    if ((last - first) / DAY >= 366) {
      fail('One application can cover at most 366 calendar days.');
    }

    if (!\['full', 'am', 'pm'].includes(duration)) {
      fail('Choose full day, morning, or afternoon.');
    }

    if (duration !== 'full' && start !== end) {
      fail('Half-day leave must start and end on the same date.');
    }

    const result = [];

    for (
      let tick = first.valueOf();
      tick <= last.valueOf();
      tick += DAY
    ) {
      const date = isoDate(new Date(tick));

      if (isWeekday(date) && !own(holidays, date)) {
        result.push({
          date,
          units: duration === 'full' ? 1 : 0.5,
          period: duration
        });
      }
    }

    if (!result.length) {
      fail(
        'Select at least one working day outside weekends and configured public holidays.'
      );
    }

    return result;
  }

  function splitUnits(units) {
    return units.reduce((result, item) => {
      const year = item.date.slice(0, 4);
      result[year] = (result[year] || 0) + item.units;
      return result;
    }, {});
  }

  function allocations(start, end, duration = 'full', holidays = {}) {
    return splitUnits(dayUnits(start, end, duration, holidays));
  }

  function days(start, end, duration = 'full', holidays = {}) {
    return dayUnits(start, end, duration, holidays)
      .reduce((sum, day) => sum + day.units, 0);
  }

  function requestUnits(request) {
    return request.dayUnits || dayUnits(request.start, request.end);
  }

  const requestDays = (request) => requestUnits(request)
    .reduce((sum, item) => sum + item.units, 0);

  const requestAllocations = (request) => splitUnits(requestUnits(request));

  function carry(state, employeeId, year, type) {
    return type === 'annual'
      ? (state.carryForward?.[employeeId]?.[year] ?? 0)
      : 0;
  }

  function baseEntitlement(state, employeeId, year, type) {
    if (!own(TYPES, type)) {
      fail('Choose a valid leave type.');
    }

    return state.entitlements[employeeId]?.[year]?.[type] ?? DEFAULTS[type];
  }

  const entitlement = (state, employeeId, year, type) =>
    baseEntitlement(state, employeeId, year, type) +
    carry(state, employeeId, year, type);

  function balance(state, employeeId, year, type) {
    let used = 0;
    let pending = 0;

    state.requests.forEach((request) => {
      if (
        request.employeeId !== employeeId ||
        request.type !== type ||
        !\['Pending', 'Approved'].includes(request.status)
      ) {
        return;
      }

      const count = requestAllocations(request)[year] || 0;

      if (request.status === 'Approved') {
        used += count;
      } else {
        pending += count;
      }
    });

    const base = baseEntitlement(state, employeeId, year, type);
    const carried = carry(state, employeeId, year, type);

    return {
      base,
      carryForward: carried,
      entitlement: base + carried,
      used,
      pending,
      remaining: base + carried - used,
      available: base + carried - used - pending
    };
  }

  function overlaps(a, b) {
    return a.some((left) =>
      b.some((right) =>
        left.date === right.date &&
        (
          left.period === 'full' ||
          right.period === 'full' ||
          left.period === right.period
        )
      )
    );
  }

  function validateApplication(state, application, employees, ignoreId) {
    if (
      !employees.some((employee) =>
        employee.id === application.employeeId &&
        employee.status === 'Active'
      )
    ) {
      fail('Select an active employee.');
    }

    if (!own(TYPES, application.type)) {
      fail('Choose a valid leave type.');
    }

    if (
      typeof application.reason !== 'string' ||
      !application.reason.trim() ||
      application.reason.trim().length > 500
    ) {
      fail('Enter a reason of 1–500 characters. Do not include diagnoses.');
    }

    if (
      application.contact != null &&
      (
        typeof application.contact !== 'string' ||
        application.contact.length > 100
      )
    ) {
      fail('Contact must be at most 100 characters.');
    }

    const existing = ignoreId &&
      state.requests.find((item) => item.id === ignoreId);

    const duration = application.duration || 'full';

    if (
      !existing &&
      duration !== 'full' &&
      !state.policy.allowHalfDays
    ) {
      fail('Half-day leave is disabled in policy settings.');
    }

    const units = existing
      ? requestUnits(existing)
      : dayUnits(
        application.start,
        application.end,
        duration,
        state.policy.holidays
      );

    const others = {
      ...state,
      requests: state.requests.filter((item) => item.id !== ignoreId)
    };

    if (
      others.requests.some((item) =>
        item.employeeId === application.employeeId &&
        ['Pending', 'Approved'].includes(item.status) &&
        overlaps(requestUnits(item), units)
      )
    ) {
      fail(
        'This employee already has overlapping pending or approved leave. Opposite half-days are allowed.'
      );
    }

    for (const [year, count] of Object.entries(splitUnits(units))) {
      const available = balance(
        others,
        application.employeeId,
        year,
        application.type
      ).available;

      if (count > available) {
        fail(
          `Insufficient ${TYPES[application.type].toLowerCase()} balance in ${year}: ${count} day(s) requested.`
        );
      }
    }

    return units;
  }

  function validateEntitlements(
    state,
    employeeId,
    year,
    values,
    carried = 0
  ) {
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9999
    ) {
      fail('Choose a valid entitlement year.');
    }

    if (
      !Number.isFinite(carried) ||
      carried < 0 ||
      carried > 366 ||
      !Number.isInteger(carried * 2)
    ) {
      fail('Annual carry-forward must be 0–366 in half-day increments.');
    }

    for (const type of Object.keys(TYPES)) {
      const amount = values[type];

      if (
        !Number.isFinite(amount) ||
        amount < 0 ||
        amount > 366 ||
        !Number.isInteger(amount * 2)
      ) {
        fail('Entitlements must be 0–366 in half-day increments.');
      }

      const current = balance(state, employeeId, year, type);

      if (
        amount + (type === 'annual' ? carried : 0) <
        current.used + current.pending
      ) {
        fail(
          `${TYPES[type]} allowance cannot be lower than approved plus reserved days (${current.used + current.pending}).`
        );
      }
    }
  }

  function validateAttachment(file) {
    if (file == null) return;

    const prefixes = {
      'application/pdf': 'data:application/pdf;base64,',
      'image/png': 'data:image/png;base64,',
      'image/jpeg': 'data:image/jpeg;base64,'
    };

    if (
      !file ||
      typeof file.name !== 'string' ||
      file.name.length > 150 ||
      !own(prefixes, file.type) ||
      !Number.isInteger(file.size) ||
      file.size < 1 ||
      file.size > 262144 ||
      typeof file.data !== 'string' ||
      !file.data.startsWith(prefixes[file.type])
    ) {
      fail('Use a fictional PDF, PNG, or JPEG attachment up to 256 KB.');
    }

    const encoded = file.data.slice(prefixes[file.type].length);

    if (
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) ||
      encoded.length !== 4 * Math.ceil(file.size / 3)
    ) {
      fail('Invalid attachment encoding.');
    }
  }

  function transition(state, id, action, actor, note, employees) {
    const request = state.requests.find((item) => item.id === id);

    if (!request) {
      fail('Application no longer exists.');
    }

    if (
      typeof actor !== 'string' ||
      !actor.trim() ||
      actor.trim().length > 100
    ) {
      fail('Enter a demo actor name (1–100 characters).');
    }

    if (
      typeof note !== 'string' ||
      note.length > 500
    ) {
      fail('Decision note must be at most 500 characters.');
    }

    let status = request.status;
    let cancellation = request.cancellation || null;
    let event;

    if (action === 'approve' || action === 'reject') {
      if (status !== 'Pending') {
        fail('Only pending applications can be approved or rejected.');
      }

      if (action === 'reject' && !note.trim()) {
        fail('Rejection requires a reason.');
      }

      if (action === 'approve') {
        validateApplication(state, request, employees, id);
      }

      status = action === 'approve' ? 'Approved' : 'Rejected';
      event = status;
    } else if (action === 'requestCancel') {
      if (
        !\['Pending', 'Approved'].includes(status) ||
        cancellation
      ) {
        fail('Cancellation cannot be requested in the current state.');
      }

      if (!note.trim()) {
        fail('Enter a cancellation reason.');
      }

      cancellation = {
        requestedAt: new Date().toISOString(),
        actor: actor.trim(),
        reason: note.trim()
      };

      event = 'Cancellation requested';
    } else if (
      action === 'confirmCancel' ||
      action === 'rejectCancel'
    ) {
      if (
        !cancellation ||
        !\['Pending', 'Approved'].includes(status)
      ) {
        fail('No cancellation request is awaiting review.');
      }

      if (action === 'rejectCancel' && !note.trim()) {
        fail('Declining cancellation requires a reason.');
      }

      if (action === 'confirmCancel') {
        status = 'Cancelled';
      }

      cancellation = null;

      event = action === 'confirmCancel'
        ? 'Cancelled'
        : 'Cancellation declined';
    } else {
      fail('Unknown decision.');
    }

    if (status === 'Rejected') {
      cancellation = null;
    }

    const at = new Date().toISOString();

    return {
      ...request,
      status,
      cancellation,
      history: [
        ...request.history,
        {
          status: event,
          actor: actor.trim(),
          note: note.trim(),
          at
        }
      ]
    };
  }

  function emptyState() {
    return {
      version: 1,
      revision: 2,
      requests: [],
      entitlements: {},
      carryForward: {},
      policy: {
        allowHalfDays: true,
        holidays: {}
      },
      notifications: []
    };
  }

  function validateState(input) {
    if (
      !input ||
      input.version !== 1 ||
      (
        input.revision != null &&
        !\[1, 2].includes(input.revision)
      ) ||
      !Array.isArray(input.requests) ||
      !input.entitlements ||
      typeof input.entitlements !== 'object' ||
      Array.isArray(input.entitlements)
    ) {
      fail('Unsupported leave storage format.');
    }

    const state = JSON.parse(JSON.stringify(input));

    state.policy ??= {
      allowHalfDays: true,
      holidays: {}
    };

    state.carryForward ??= {};
    state.notifications ??= [];

    if (
      typeof state.policy.allowHalfDays !== 'boolean' ||
      !state.policy.holidays ||
      typeof state.policy.holidays !== 'object' ||
      Array.isArray(state.policy.holidays)
    ) {
      fail('Invalid holiday policy.');
    }

    for (const [date, label] of Object.entries(state.policy.holidays)) {
      parseDate(date);

      if (
        typeof label !== 'string' ||
        !label.trim() ||
        label.length > 100
      ) {
        fail('Invalid holiday label.');
      }
    }

    const ids = new Set();

    for (const request of state.requests) {
      if (
        !request ||
        typeof request.id !== 'string' ||
        ids.has(request.id) ||
        typeof request.employeeId !== 'string' ||
        typeof request.employeeName !== 'string' ||
        !own(TYPES, request.type) ||
        !STATUSES.includes(request.status) ||
        typeof request.reason !== 'string' ||
        !Array.isArray(request.history)
      ) {
        fail('Invalid stored application.');
      }

      // Legacy requests retain their original weekday charges.
      // New holiday settings do not change historical calculations.
      request.duration ??= 'full';
      request.contact ??= '';
      request.department ??= '';

      if (
        !\['full', 'am', 'pm'].includes(request.duration) ||
        typeof request.contact !== 'string' ||
        request.contact.length > 100 ||
        typeof request.department !== 'string'
      ) {
        fail('Invalid application details.');
      }

      const candidates = dayUnits(
        request.start,
        request.end,
        request.duration
      );

      request.dayUnits ??= candidates;

      if (
        !Array.isArray(request.dayUnits) ||
        !request.dayUnits.length
      ) {
        fail('Invalid working-day snapshot.');
      }

      const dates = new Set();

      for (const day of request.dayUnits) {
        if (
          !day ||
          dates.has(day.date) ||
          !candidates.some((item) =>
            item.date === day.date &&
            item.units === day.units &&
            item.period === day.period
          )
        ) {
          fail('Invalid working-day snapshot.');
        }

        dates.add(day.date);
      }

      for (const entry of request.history) {
        if (
          !entry ||
          typeof entry.status !== 'string' ||
          typeof entry.actor !== 'string' ||
          typeof entry.note !== 'string' ||
          typeof entry.at !== 'string' ||
          Number.isNaN(Date.parse(entry.at))
        ) {
          fail('Invalid application history.');
        }
      }

      if (
        request.cancellation != null &&
        (
          !\['Pending', 'Approved'].includes(request.status) ||
          typeof request.cancellation.reason !== 'string' ||
          typeof request.cancellation.actor !== 'string' ||
          Number.isNaN(Date.parse(request.cancellation.requestedAt))
        )
      ) {
        fail('Invalid cancellation request.');
      }

      validateAttachment(request.attachment);
      ids.add(request.id);
    }

    for (const years of Object.values(state.entitlements)) {
      if (
        !years ||
        typeof years !== 'object' ||
        Array.isArray(years)
      ) {
        fail('Invalid entitlements.');
      }

      for (const [year, values] of Object.entries(years)) {
        if (
          !/^\d{4}$/.test(year) ||
          +year < 1900 ||
          !values ||
          typeof values !== 'object'
        ) {
          fail('Invalid entitlement year.');
        }

        for (const type of Object.keys(TYPES)) {
          if (
            !Number.isFinite(values[type]) ||
            values[type] < 0 ||
            values[type] > 366 ||
            !Number.isInteger(values[type] * 2)
          ) {
            fail('Invalid allowance.');
          }
        }
      }
    }

    if (
      !state.carryForward ||
      typeof state.carryForward !== 'object' ||
      Array.isArray(state.carryForward)
    ) {
      fail('Invalid carry-forward settings.');
    }

    for (const years of Object.values(state.carryForward)) {
      if (
        !years ||
        typeof years !== 'object' ||
        Array.isArray(years)
      ) {
        fail('Invalid carry-forward settings.');
      }

      for (const [year, value] of Object.entries(years)) {
        if (
          !/^\d{4}$/.test(year) ||
          +year < 1900 ||
          !Number.isFinite(value) ||
          value < 0 ||
          value > 366 ||
          !Number.isInteger(value * 2)
        ) {
          fail('Invalid carry-forward allowance.');
        }
      }
    }

    if (
      !Array.isArray(state.notifications) ||
      state.notifications.some((n) =>
        !n ||
        typeof n.id !== 'string' ||
        typeof n.requestId !== 'string' ||
        typeof n.message !== 'string' ||
        typeof n.read !== 'boolean' ||
        Number.isNaN(Date.parse(n.at))
      )
    ) {
      fail('Invalid local notifications.');
    }

    state.revision = 2;
    return state;
  }

  return Object.freeze({
    TYPES,
    DEFAULTS,
    STATUSES,
    DAY,
    parseDate,
    isoDate,
    isWeekday,
    dayUnits,
    splitUnits,
    allocations,
    days,
    requestUnits,
    requestDays,
    requestAllocations,
    baseEntitlement,
    entitlement,
    balance,
    validateApplication,
    validateEntitlements,
    validateAttachment,
    transition,
    emptyState,
    validateState
  });
}));

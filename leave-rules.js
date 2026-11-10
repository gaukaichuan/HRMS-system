/* PeopleDesk leave prototype: pure rules shared by UI and tests. */
(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LeaveRules = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TYPES = Object.freeze({
    annual: 'Annual leave',
    medical: 'Medical leave',
    emergency: 'Emergency leave'
  });

  // Demo values only—not statutory or confirmed company policy.
  const DEFAULTS = Object.freeze({
    annual: 14,
    medical: 14,
    emergency: 3
  });

  const STATUSES = [
    'Pending',
    'Approved',
    'Rejected',
    'Cancelled'
  ];

  const DAY = 86400000;

  function fail(message) {
    throw new Error(message);
  }

  function parseDate(value) {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      fail('Choose a valid date.');
    }

    const [y, m, d] = value.split('-').map(Number);

    if (y < 1900 || y > 9999) {
      fail('Dates must be between 1900 and 9999.');
    }

    const date = new Date(Date.UTC(y, m - 1, d));

    if (
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) {
      fail('Choose a valid calendar date.');
    }

    return date;
  }

  function allocations(start, end) {
    const first = parseDate(start);
    const last = parseDate(end);

    if (last < first) {
      fail('End date cannot be earlier than start date.');
    }

    if ((last - first) / DAY >= 366) {
      fail('A single application can cover at most 366 calendar days.');
    }

    const result = {};

    for (
      let tick = first.valueOf();
      tick <= last.valueOf();
      tick += DAY
    ) {
      const date = new Date(tick);
      const weekday = date.getUTCDay();

      if (weekday !== 0 && weekday !== 6) {
        const year = date.getUTCFullYear();
        result[year] = (result[year] || 0) + 1;
      }
    }

    if (!Object.keys(result).length) {
      fail('Select at least one Monday–Friday working day.');
    }

    return result;
  }

  function days(start, end) {
    return Object.values(allocations(start, end))
      .reduce((sum, n) => sum + n, 0);
  }

  function entitlement(state, employeeId, year, type) {
    if (!Object.hasOwn(TYPES, type)) {
      fail('Choose a valid leave type.');
    }

    return (
      state.entitlements[employeeId]?.[year]?.[type] ??
      DEFAULTS[type]
    );
  }

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

      const count = allocations(
        request.start,
        request.end
      )[year] || 0;

      if (request.status === 'Approved') {
        used += count;
      } else {
        pending += count;
      }
    });

    const total = entitlement(
      state,
      employeeId,
      year,
      type
    );

    return {
      entitlement: total,
      used,
      pending,
      remaining: total - used,
      available: total - used - pending
    };
  }

  function validateApplication(
    state,
    application,
    employees,
    ignoreId
  ) {
    const employee = employees.find((item) => (
      item.id === application.employeeId &&
      item.status === 'Active'
    ));

    if (!employee) {
      fail('Select an active employee.');
    }

    if (!Object.hasOwn(TYPES, application.type)) {
      fail('Choose a valid leave type.');
    }

    if (
      typeof application.reason !== 'string' ||
      !application.reason.trim() ||
      application.reason.trim().length > 500
    ) {
      fail(
        'Enter a reason of 1–500 characters. ' +
        'Do not include medical details.'
      );
    }

    const split = allocations(
      application.start,
      application.end
    );

    const others = {
      ...state,
      requests: state.requests.filter(
        (item) => item.id !== ignoreId
      )
    };

    const overlap = others.requests.some((item) => (
      item.employeeId === application.employeeId &&
      ['Pending', 'Approved'].includes(item.status) &&
      item.start <= application.end &&
      item.end >= application.start
    ));

    if (overlap) {
      fail(
        'This employee already has pending or approved ' +
        'leave overlapping these dates.'
      );
    }

    for (const [year, count] of Object.entries(split)) {
      const available = balance(
        others,
        application.employeeId,
        year,
        application.type
      ).available;

      if (count > available) {
        fail(
          `Insufficient ${TYPES[application.type].toLowerCase()} ` +
          `balance in ${year}. This application needs ` +
          `${count} working day(s).`
        );
      }
    }

    return split;
  }

  function validateEntitlements(
    state,
    employeeId,
    year,
    values
  ) {
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 9999
    ) {
      fail('Choose a valid entitlement year.');
    }

    for (const type of Object.keys(TYPES)) {
      const amount = values[type];

      if (
        !Number.isInteger(amount) ||
        amount < 0 ||
        amount > 366
      ) {
        fail(
          'Each entitlement must be a whole number ' +
          'from 0 to 366.'
        );
      }

      const current = balance(
        state,
        employeeId,
        year,
        type
      );

      if (amount < current.used + current.pending) {
        fail(
          `${TYPES[type]} entitlement cannot be less than ` +
          'its approved and reserved days ' +
          `(${current.used + current.pending}).`
        );
      }
    }
  }

  function transition(
    state,
    id,
    action,
    actor,
    note,
    employees
  ) {
    const request = state.requests.find(
      (item) => item.id === id
    );

    if (!request) {
      fail('This application no longer exists.');
    }

    const target = {
      approve: 'Approved',
      reject: 'Rejected',
      cancel: 'Cancelled'
    }[action];

    if (
      !target ||
      !(
        request.status === 'Pending' ||
        (
          request.status === 'Approved' &&
          action === 'cancel'
        )
      )
    ) {
      fail(
        'This application cannot be changed ' +
        'from its current status.'
      );
    }

    if (
      typeof actor !== 'string' ||
      !actor.trim() ||
      actor.trim().length > 100
    ) {
      fail('Enter a demo reviewer name (1–100 characters).');
    }

    if (
      typeof note !== 'string' ||
      note.length > 500
    ) {
      fail('Decision notes must be at most 500 characters.');
    }

    if (action === 'reject' && !note.trim()) {
      fail('Enter a reason for rejection.');
    }

    if (action === 'approve') {
      validateApplication(
        state,
        request,
        employees,
        request.id
      );
    }

    const at = new Date().toISOString();

    return {
      ...request,
      status: target,
      history: [
        ...request.history,
        {
          status: target,
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
      requests: [],
      entitlements: {}
    };
  }

  function validateState(state) {
    if (
      !state ||
      state.version !== 1 ||
      !Array.isArray(state.requests) ||
      !state.entitlements ||
      typeof state.entitlements !== 'object' ||
      Array.isArray(state.entitlements)
    ) {
      fail('Unrecognized leave storage format.');
    }

    const ids = new Set();

    for (const request of state.requests) {
      if (
        !request ||
        typeof request.id !== 'string' ||
        ids.has(request.id) ||
        typeof request.employeeId !== 'string' ||
        typeof request.employeeName !== 'string' ||
        !Object.hasOwn(TYPES, request.type) ||
        !STATUSES.includes(request.status) ||
        typeof request.reason !== 'string' ||
        !Array.isArray(request.history)
      ) {
        fail('Invalid stored leave application.');
      }

      allocations(request.start, request.end);

      for (const entry of request.history) {
        if (
          !entry ||
          !STATUSES.includes(entry.status) ||
          typeof entry.actor !== 'string' ||
          typeof entry.note !== 'string' ||
          typeof entry.at !== 'string' ||
          Number.isNaN(Date.parse(entry.at))
        ) {
          fail('Invalid stored leave history.');
        }
      }

      ids.add(request.id);
    }

    for (
      const years of Object.values(state.entitlements)
    ) {
      if (
        !years ||
        typeof years !== 'object' ||
        Array.isArray(years)
      ) {
        fail('Invalid stored leave entitlements.');
      }

      for (const [year, values] of Object.entries(years)) {
        if (
          !/^\d{4}$/.test(year) ||
          Number(year) < 1900 ||
          Number(year) > 9999 ||
          !values ||
          typeof values !== 'object'
        ) {
          fail('Invalid stored entitlement year.');
        }

        for (const type of Object.keys(TYPES)) {
          if (
            !Number.isInteger(values[type]) ||
            values[type] < 0 ||
            values[type] > 366
          ) {
            fail('Invalid stored entitlement amount.');
          }
        }
      }
    }

    return state;
  }

  return Object.freeze({
    TYPES,
    DEFAULTS,
    STATUSES,
    parseDate,
    allocations,
    days,
    entitlement,
    balance,
    validateApplication,
    validateEntitlements,
    transition,
    emptyState,
    validateState
  });
}));

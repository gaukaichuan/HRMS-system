/* PeopleDesk employee-week timeline. Pure date/layout/render helpers only. */
(function (root) {
  'use strict';

  const DAY = 86400000;
  const MIN = Date.parse('1900-01-01T00:00:00Z');
  const MAX = Date.parse('9999-12-31T00:00:00Z');

  const esc = value => String(value ?? '').replace(
    /[&<>"']/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c])
  );

  const iso = value =>
    new Date(value).toISOString().slice(0, 10);

  function time(date) {
    if (
      typeof date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      throw new Error(
        'Use a date in YYYY-MM-DD format.'
      );
    }

    const value = Date.parse(
      date + 'T00:00:00Z'
    );

    if (
      !Number.isFinite(value) ||
      value < MIN ||
      value > MAX ||
      iso(value) !== date
    ) {
      throw new Error(
        'Choose a valid date from 1900 to 9999.'
      );
    }

    return value;
  }

  function start(date, monday = false) {
    let value = time(date);

    if (monday) {
      value -= (
        (new Date(value).getUTCDay() + 6) % 7
      ) * DAY;
    }

    return iso(
      Math.min(
        MAX - 6 * DAY,
        Math.max(MIN, value)
      )
    );
  }

  function shift(date, weeks) {
    return iso(
      Math.max(
        MIN,
        Math.min(
          MAX - 6 * DAY,
          time(date) + weeks * 7 * DAY
        )
      )
    );
  }

  function dates(date) {
    const value = time(start(date));

    return Array.from(
      { length: 7 },
      (_, i) => iso(value + i * DAY)
    );
  }

  function label(date, options = {}) {
    return new Date(time(date)).toLocaleDateString(
      'en-GB',
      {
        ...options,
        timeZone: 'UTC'
      }
    );
  }

  function rangeLabel(date) {
    const week = dates(date);

    return (
      label(
        week[0],
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      ) +
      ' – ' +
      label(
        week[6],
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      )
    );
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => [...word][0])
      .join('')
      .toUpperCase();
  }

  function segments(
    requests,
    week,
    getUnits,
    filter = {}
  ) {
    const result = [];

    const index = new Map(
      week.map(
        (date, i) => [date, i]
      )
    );

    requests.forEach(request => {
      if (
        request.status !== 'Pending' &&
        request.status !== 'Approved'
      ) {
        return;
      }

      const days = getUnits(request)
        .filter(day => (
          index.has(day.date) &&
          (
            !filter.from ||
            day.date >= filter.from
          ) &&
          (
            !filter.to ||
            day.date <= filter.to
          )
        ))
        .slice()
        .sort(
          (a, b) => a.date.localeCompare(b.date)
        );

      let current = null;

      days.forEach(day => {
        const col = index.get(day.date);

        const period = day.units === 0.5
          ? (
              day.period === 'pm' ||
              request.duration === 'pm'
                ? 'pm'
                : 'am'
            )
          : 'full';

        if (
          current &&
          period === 'full' &&
          current.period === 'full' &&
          col === current.end + 1
        ) {
          current.end = col;
          current.units += day.units;
        } else {
          current = {
            request,
            start: col,
            end: col,
            period,
            units: day.units
          };

          result.push(current);
        }
      });
    });

    result.sort(
      (a, b) => (
        a.start - b.start ||
        a.end - b.end ||
        a.request.id.localeCompare(b.request.id)
      )
    );

    return result;
  }

  function lanes(items) {
    const occupied = [];

    const placed = items.map(item => {
      const mask = item.period === 'am'
        ? 1
        : item.period === 'pm'
          ? 2
          : 3;

      let lane = occupied.findIndex(cells => {
        for (
          let col = item.start;
          col <= item.end;
          col++
        ) {
          if (cells[col] & mask) {
            return false;
          }
        }

        return true;
      });

      if (lane < 0) {
        lane = occupied.length;
        occupied.push(Array(7).fill(0));
      }

      for (
        let col = item.start;
        col <= item.end;
        col++
      ) {
        occupied[lane][col] |= mask;
      }

      return {
        ...item,
        lane
      };
    });

    return {
      items: placed,
      count: Math.max(1, occupied.length)
    };
  }

  function render({
    startDate,
    employees,
    requests,
    holidays = {},
    types = {},
    getUnits,
    today = '',
    filter = {}
  }) {
    const week = dates(startDate);

    const allSegments = segments(
      requests,
      week,
      getUnits,
      filter
    );

    const byEmployee = new Map();

    allSegments.forEach(item => {
      if (
        !byEmployee.has(
          item.request.employeeId
        )
      ) {
        byEmployee.set(
          item.request.employeeId,
          []
        );
      }

      byEmployee
        .get(item.request.employeeId)
        .push(item);
    });

    const heading = week.map(date => {
      const weekend = [0, 6].includes(
        new Date(time(date)).getUTCDay()
      );

      const holiday = holidays[date];

      return `
        <div
          role="columnheader"
          class="tl-date ${
            weekend ? 'is-weekend' : ''
          } ${
            date === today ? 'is-today' : ''
          }"
        >
          <time datetime="${date}">
            <strong>${Number(date.slice(8))}</strong>
            <span>${label(date, { weekday: 'short' })}</span>
          </time>

          ${
            holiday
              ? `
                <span
                  class="tl-holiday"
                  title="${esc(holiday)}"
                >
                  ★ ${esc(holiday)}
                </span>
              `
              : ''
          }
        </div>
      `;
    }).join('');

    const rows = employees.map(employee => {
      const placed = lanes(
        byEmployee.get(employee.id) || []
      );

      const cells = week.map((date, i) => `
        <div
          role="cell"
          class="tl-background ${
            [0, 6].includes(
              new Date(time(date)).getUTCDay()
            )
              ? 'is-weekend'
              : ''
          } ${
            date === today ? 'is-today' : ''
          } ${
            holidays[date] ? 'is-holiday' : ''
          }"
          style="grid-column:${i + 1};grid-row:1 / span ${placed.count}"
        >
          <span class="tl-sr-only">
            ${
              esc(
                label(
                  date,
                  {
                    day: 'numeric',
                    month: 'short'
                  }
                )
              )
            }${
              holidays[date]
                ? ' — ' + esc(holidays[date])
                : ''
            }
          </span>
        </div>
      `).join('');

      const bars = placed.items.map(item => {
        const request = item.request;

        const title =
          `${employee.name} · ` +
          `${types[request.type] || request.type} · ` +
          `${week[item.start]} to ${week[item.end]} · ` +
          request.status +
          (
            item.period !== 'full'
              ? ' · ' + item.period.toUpperCase()
              : ''
          ) +
          (
            request.cancellation
              ? ' · Cancellation requested'
              : ''
          );

        return `
          <button
            type="button"
            class="tl-event ${esc(request.type)} ${
              request.status.toLowerCase()
            } ${
              item.period === 'full'
                ? ''
                : 'is-half ' + item.period
            }"
            style="grid-column:${item.start + 1} / span ${item.end - item.start + 1};grid-row:${item.lane + 1}"
            data-leave-action="details"
            data-id="${esc(request.id)}"
            title="${esc(title)}"
            aria-label="${esc(title)}"
          >
            <strong>
              ${esc(types[request.type] || request.type)}
            </strong>

            <span>
              ${request.status}${
                item.period !== 'full'
                  ? ' · ' + item.period.toUpperCase()
                  : ''
              } · ${item.units} day${
                item.units === 1 ? '' : 's'
              }
            </span>

            ${
              request.cancellation
                ? '<span>Cancellation requested</span>'
                : ''
            }
          </button>
        `;
      }).join('');

      return `
        <div role="row" class="tl-row">
          <div role="rowheader" class="tl-person">
            <span
              class="tl-avatar"
              aria-hidden="true"
            >
              ${esc(initials(employee.name))}
            </span>

            <div>
              <strong>${esc(employee.name)}</strong>

              <span>
                ${esc(employee.department || 'Unassigned')}
              </span>

              ${
                employee.status !== 'Active'
                  ? `
                    <small>
                      ${esc(employee.status || 'Inactive')}
                    </small>
                  `
                  : ''
              }
            </div>
          </div>

          <div
            class="tl-track"
            style="grid-template-rows:repeat(${placed.count}, minmax(86px,auto))"
          >
            ${cells}
            ${bars}
          </div>
        </div>
      `;
    }).join('');

    const markup = `
      <div
        class="tl-scroll"
        tabindex="0"
        role="region"
        aria-label="Weekly employee leave timeline; scroll horizontally to view all dates"
      >
        <div
          class="tl-table"
          role="table"
          aria-label="Employee leave, ${esc(rangeLabel(week[0]))}"
        >
          <div
            class="tl-row tl-header"
            role="row"
          >
            <div
              class="tl-person tl-person-heading"
              role="columnheader"
            >
              Team member
            </div>

            <div class="tl-date-headings">
              ${heading}
            </div>
          </div>

          ${
            rows ||
            '<p class="tl-empty">No team members match the employee filters.</p>'
          }
        </div>
      </div>
    `;

    const visibleIds = new Set(
      employees.map(employee => employee.id)
    );

    return {
      html: markup,

      count: new Set(
        allSegments
          .filter(
            item => visibleIds.has(
              item.request.employeeId
            )
          )
          .map(
            item => item.request.id
          )
      ).size,

      employees: employees.length
    };
  }

  const api = Object.freeze({
    DAY,
    start,
    shift,
    dates,
    rangeLabel,
    segments,
    lanes,
    render
  });

  if (
    typeof module === 'object' &&
    module.exports
  ) {
    module.exports = api;
  } else {
    root.PeopleDeskCalendarTimeline = api;
  }
})(
  typeof window === 'object'
    ? window
    : globalThis
);

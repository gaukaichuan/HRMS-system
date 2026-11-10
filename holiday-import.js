/* PeopleDesk public-holiday CSV and plain-text parser. No network or storage access. */
(function (root) {
  'use strict';

  const MAX_BYTES = 512 * 1024;
  const MAX_ROWS = 2000;

  const own = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  function validYear(value) {
    const text = String(value);

    if (
      !/^\d{4}$/.test(text) ||
      Number(text) < 1900 ||
      Number(text) > 9999
    ) {
      throw new Error(
        'Choose a four-digit year from 1900 to 9999.'
      );
    }

    return text;
  }

  function csvRows(text) {
    if (
      typeof text !== 'string' ||
      text.length > MAX_BYTES
    ) {
      throw new Error(
        'Choose a CSV file no larger than 512 KB.'
      );
    }

    text = text.replace(/^\uFEFF/, '');

    const rows = [];

    let row = [];
    let cell = '';
    let quoted = false;
    let closed = false;

    function finishCell() {
      row.push(cell);
      cell = '';
      closed = false;
    }

    function finishRow() {
      finishCell();

      if (row.some((value) => value.trim())) {
        rows.push(row);
      }

      if (rows.length > MAX_ROWS) {
        throw new Error(
          'Too many CSV rows (maximum 2000).'
        );
      }

      row = [];
    }

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (quoted) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = false;
            closed = true;
          }
        } else {
          cell += char;
        }
      } else if (char === ',') {
        finishCell();
      } else if (char === '\r' || char === '\n') {
        finishRow();

        if (
          char === '\r' &&
          text[i + 1] === '\n'
        ) {
          i += 1;
        }
      } else if (char === '"') {
        if (cell || closed) {
          throw new Error(
            'Invalid CSV quotation. Save as CSV UTF-8 from Excel.'
          );
        }

        quoted = true;
      } else if (closed) {
        if (char.trim()) {
          throw new Error(
            'Unexpected text after a quoted CSV field.'
          );
        }
      } else {
        cell += char;
      }
    }

    if (quoted) {
      throw new Error(
        'An opening CSV quote has no closing quote.'
      );
    }

    if (cell || row.length || closed) {
      finishRow();
    }

    return rows;
  }

  function parse(text, selectedYear) {
    const year = validYear(selectedYear);
    const rows = csvRows(text);

    if (rows.length < 2) {
      throw new Error(
        'Include the Date,Holiday header and at least one holiday.'
      );
    }

    const header = rows.shift().map(
      (value) => value.trim().toLowerCase()
    );

    if (
      header.length !== 2 ||
      header[0] !== 'date' ||
      (
        header[1] !== 'holiday' &&
        header[1] !== 'holiday name'
      )
    ) {
      throw new Error(
        'Use exactly two CSV columns in this order: Date,Holiday.'
      );
    }

    const entries = [];
    const seen = new Map();

    let duplicates = 0;

    rows.forEach((row, index) => {
      const prefix = `Data row ${index + 1}: `;

      if (row.length !== 2) {
        throw new Error(
          prefix +
          'expected exactly two columns. Quote names containing commas.'
        );
      }

      const date = row[0].trim();

      const name = row[1]
        .trim()
        .replace(/[\r\n\t]+/g, ' ');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(
          prefix + 'date must use YYYY-MM-DD.'
        );
      }

      const parsed = new Date(
        date + 'T00:00:00.000Z'
      );

      if (
        !Number.isFinite(parsed.valueOf()) ||
        parsed.toISOString().slice(0, 10) !== date
      ) {
        throw new Error(
          prefix + 'date does not exist.'
        );
      }

      if (date.slice(0, 4) !== year) {
        throw new Error(
          prefix +
          `date must be in the selected year (${year}).`
        );
      }

      if (
        !name ||
        name.length > 100 ||
        /[\u0000-\u001f\u007f]/.test(name)
      ) {
        throw new Error(
          prefix +
          'holiday name must contain 1–100 characters without control characters.'
        );
      }

      if (seen.has(date)) {
        if (seen.get(date) !== name) {
          throw new Error(
            prefix +
            'two different names use the same date. Combine them into one name first.'
          );
        }

        duplicates += 1;
      } else {
        seen.set(date, name);

        entries.push({
          date,
          name
        });
      }
    });

    entries.sort(
      (a, b) => a.date.localeCompare(b.date)
    );

    return {
      year,
      entries,
      duplicates
    };
  }

  function checkTextSize(text) {
    if (
      typeof text !== 'string' ||
      new TextEncoder().encode(text).length > MAX_BYTES
    ) {
      throw new Error(
        'Holiday text must be no larger than 512 KB (UTF-8).'
      );
    }
  }

  function parseText(text, selectedYear) {
    checkTextSize(text);

    const lines = text
      .replace(/^\uFEFF/, '')
      .split(/\r\n|\r|\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (
      lines.length &&
      /^date\s*(?:\||\t)\s*holiday(?: name)?$/i.test(
        lines[0]
      )
    ) {
      lines.shift();
    }

    if (!lines.length) {
      throw new Error(
        'Enter at least one holiday: YYYY-MM-DD | Holiday name.'
      );
    }

    if (lines.length > MAX_ROWS - 1) {
      throw new Error(
        'Too many text rows (maximum 1999).'
      );
    }

    const rows = lines.map((line, index) => {
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2})(?:\s*\|\s*|\t+)(.*)$/
      );

      if (!match) {
        throw new Error(
          `Text row ${index + 1}: use YYYY-MM-DD | Holiday name (or a tab between the date and name).`
        );
      }

      return [
        match[1],
        match[2]
      ];
    });

    // Reuse the CSV parser's date, year, name,
    // and duplicate validation.
    const csv =
      'Date,Holiday\n' +
      rows.map(
        (row) => row.map(
          (value) =>
            '"' +
            value.replace(/"/g, '""') +
            '"'
        ).join(',')
      ).join('\n');

    return parse(csv, selectedYear);
  }

  function parseInput(
    text,
    selectedYear,
    format = 'auto'
  ) {
    checkTextSize(text);

    if (
      format !== 'auto' &&
      format !== 'csv' &&
      format !== 'text'
    ) {
      throw new Error(
        'Choose CSV or plain text.'
      );
    }

    const firstLine = text
      .replace(/^\uFEFF/, '')
      .split(/\r\n|\r|\n/)
      .find((line) => line.trim()) || '';

    const useCSV =
      format === 'csv' ||
      (
        format === 'auto' &&
        /^\s*(?:date|"date")\s*,/i.test(firstLine)
      );

    return useCSV
      ? parse(text, selectedYear)
      : parseText(text, selectedYear);
  }

  function plan(parsed, existing) {
    const rows = parsed.entries.map(
      (entry) => ({
        ...entry,

        status:
          !own(existing, entry.date)
            ? 'add'
            : existing[entry.date] === entry.name
              ? 'duplicate'
              : 'conflict',

        existingName:
          own(existing, entry.date)
            ? existing[entry.date]
            : null
      })
    );

    return {
      year: parsed.year,
      rows,

      additions: rows.filter(
        (row) => row.status === 'add'
      ),

      duplicates:
        parsed.duplicates +
        rows.filter(
          (row) => row.status === 'duplicate'
        ).length,

      conflicts: rows.filter(
        (row) => row.status === 'conflict'
      ).length
    };
  }

  const api = Object.freeze({
    MAX_BYTES,
    validYear,
    csvRows,
    parse,
    parseText,
    parseInput,
    plan
  });

  if (
    typeof module === 'object' &&
    module.exports
  ) {
    module.exports = api;
  } else {
    root.PeopleDeskHolidayImport = api;
  }
})(
  typeof window === 'object'
    ? window
    : globalThis
);

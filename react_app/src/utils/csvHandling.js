import Papa from 'papaparse';

const REQUIRED_COLUMNS = [
  'cycle_num', 'V_target', 'LBand', 'HBand', 'shares_end',
  'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i'
];

const NUMERIC_COLUMNS = [
  'V_target', 'LBand', 'HBand', 'shares_end',
  'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i'
];

const OPTIONAL_NUMERIC_COLUMNS = [
  've_divergence_ratio', 'band_compression_factor', 'band_lower_ratio', 'band_upper_ratio',
  've_cap_uncapped_v'
];

const OPTIONAL_BOOLEAN_COLUMNS = ['adaptive_band_enabled', 've_cap_active'];

const EXPORT_COLUMNS = [
  ...REQUIRED_COLUMNS,
  ...OPTIONAL_BOOLEAN_COLUMNS,
  ...OPTIONAL_NUMERIC_COLUMNS,
  've_divergence_direction',
];

const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';
const UTF8_BOM = '\ufeff';

function normalizeHeader(header) {
  return String(header ?? '').replace(/^\ufeff/, '').trim();
}

function formatRowNumber(index) {
  return `${index + 2}행`;
}

function parseStrictNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? '').trim();
  if (raw === '') return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === '') return undefined;
  if (['true', '1', 'yes', 'y'].includes(raw)) return true;
  if (['false', '0', 'no', 'n'].includes(raw)) return false;
  return null;
}

function isBlankRow(row) {
  return Object.values(row).every((value) => String(value ?? '').trim() === '');
}

function buildError(message, rowIndex = null) {
  return rowIndex === null ? message : `CSV 오류 (${formatRowNumber(rowIndex)}): ${message}`;
}

function validateDomain(parsed, rowIndex) {
  if (parsed.price_end <= 0) {
    return buildError("'price_end' 값은 0보다 커야 합니다.", rowIndex);
  }

  if (parsed.G < 1) {
    return buildError("'G' 값은 1 이상이어야 합니다.", rowIndex);
  }

  const nonNegativeColumns = [
    'cycle_num', 'V_target', 'LBand', 'HBand', 'shares_end',
    'pool_end_before_deposit', 'deposit_next', 'E_calc', 'V_i',
  ];

  const negativeColumn = nonNegativeColumns.find((col) => parsed[col] < 0);
  if (negativeColumn) {
    return buildError(`'${negativeColumn}' 값은 음수일 수 없습니다.`, rowIndex);
  }

  if (parsed.LBand > parsed.HBand) {
    return buildError("'LBand' 값은 'HBand'보다 클 수 없습니다.", rowIndex);
  }

  return null;
}

function parseOptionalColumns(row, parsed, rowIndex) {
  for (const col of OPTIONAL_NUMERIC_COLUMNS) {
    if (!(col in row) || String(row[col] ?? '').trim() === '') continue;

    const value = parseStrictNumber(row[col]);
    if (value === null) {
      return buildError(`'${col}' 컬럼에 유효하지 않은 숫자 값이 있습니다.`, rowIndex);
    }
    parsed[col] = value;
  }

  for (const col of OPTIONAL_BOOLEAN_COLUMNS) {
    if (!(col in row) || String(row[col] ?? '').trim() === '') continue;

    const value = parseBoolean(row[col]);
    if (value === null) {
      return buildError(`'${col}' 컬럼은 true/false 값이어야 합니다.`, rowIndex);
    }
    parsed[col] = value;
  }

  return null;
}

/**
 * Parse CSV file content and validate for VR Simulator history records.
 * @param {string} csvContent - Raw CSV string
 * @returns {{ success: boolean, records: Object[], error: string|null }}
 */
export function parseCSV(csvContent) {
  if (typeof csvContent !== 'string' || csvContent.trim() === '') {
    return { success: false, records: [], error: 'CSV 파일에 데이터가 없습니다.' };
  }

  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: normalizeHeader,
  });

  if (result.errors?.length > 0) {
    const firstError = result.errors[0];
    const rowLabel = Number.isInteger(firstError.row) ? ` (${formatRowNumber(firstError.row)})` : '';
    return {
      success: false,
      records: [],
      error: `CSV 파싱 오류${rowLabel}: ${firstError.message}`,
    };
  }

  const rows = (result.data || []).filter((row) => !isBlankRow(row));

  if (!rows || rows.length === 0) {
    return { success: false, records: [], error: 'CSV 파일에 데이터가 없습니다.' };
  }

  const columns = (result.meta?.fields || []).map(normalizeHeader).filter(Boolean);
  const duplicateColumns = columns.filter((col, index) => columns.indexOf(col) !== index);
  if (duplicateColumns.length > 0) {
    return {
      success: false,
      records: [],
      error: `CSV 오류: 중복 컬럼이 있습니다 (${[...new Set(duplicateColumns)].join(', ')}).`,
    };
  }

  const missingColumns = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));
  if (missingColumns.length > 0) {
    return {
      success: false,
      records: [],
      error: `CSV 파일에 필요한 컬럼이 없습니다: ${missingColumns.join(', ')}`,
    };
  }

  const records = [];

  for (const [rowIndex, row] of rows.entries()) {
    if (Array.isArray(row.__parsed_extra) && row.__parsed_extra.length > 0) {
      return {
        success: false,
        records: [],
        error: buildError('컬럼 수가 헤더보다 많습니다. 쉼표/따옴표 형식을 확인하세요.', rowIndex),
      };
    }

    const parsed = { ...row };

    const cycleNum = parseStrictNumber(row.cycle_num);
    if (cycleNum === null || !Number.isInteger(cycleNum)) {
      return {
        success: false,
        records: [],
        error: buildError("'cycle_num' 컬럼에는 정수를 입력해야 합니다.", rowIndex),
      };
    }
    parsed.cycle_num = cycleNum;

    for (const col of NUMERIC_COLUMNS) {
      const value = parseStrictNumber(row[col]);
      if (value === null) {
        return {
          success: false,
          records: [],
          error: buildError(`'${col}' 컬럼에 유효하지 않은 숫자 값이 있습니다.`, rowIndex),
        };
      }
      parsed[col] = value;
    }

    const optionalError = parseOptionalColumns(row, parsed, rowIndex);
    if (optionalError) {
      return { success: false, records: [], error: optionalError };
    }

    const domainError = validateDomain(parsed, rowIndex);
    if (domainError) {
      return { success: false, records: [], error: domainError };
    }

    records.push(parsed);
  }

  return { success: true, records, error: null };
}

function buildExportFields(history) {
  const additionalFields = history.flatMap((row) => Object.keys(row || {}));
  return [...new Set([...EXPORT_COLUMNS, ...additionalFields])];
}

function sanitizeExportRow(row, fields) {
  return Object.fromEntries(
    fields.map((field) => [field, row?.[field] ?? ''])
  );
}

/**
 * Export history array to a CSV Blob.
 * @param {Object[]} history - Array of cycle record objects
 * @returns {{ blob: Blob, filename: string }}
 */
export function exportCSV(history) {
  const safeHistory = Array.isArray(history) ? history.filter((row) => row && typeof row === 'object') : [];
  const fields = buildExportFields(safeHistory);
  const data = safeHistory.map((row) => sanitizeExportRow(row, fields));
  const csvString = Papa.unparse({ fields, data });
  const blob = new Blob([UTF8_BOM, csvString], { type: CSV_MIME_TYPE });

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const filename = `${yyyy}${mm}${dd}_vr_simulation_history.csv`;

  return { blob, filename };
}

/**
 * Serialize simple table rows to CSV with proper quoting/escaping.
 * @param {Object[]} rows
 * @param {{label: string, value: Function}[]} columns
 * @returns {string}
 */
export function serializeTableCSV(rows, columns) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  return Papa.unparse({
    fields: safeColumns.map((column) => column.label),
    data: safeRows.map((row) => (
      Object.fromEntries(
        safeColumns.map((column) => [column.label, column.value(row)])
      )
    )),
  });
}

/**
 * Trigger a browser download for a given Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  if (!blob || !filename) return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

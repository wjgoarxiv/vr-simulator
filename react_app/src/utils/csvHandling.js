import Papa from 'papaparse';

const REQUIRED_COLUMNS = [
  'cycle_num', 'V_target', 'LBand', 'HBand', 'shares_end',
  'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i'
];

const NUMERIC_COLUMNS = [
  'V_target', 'LBand', 'HBand', 'shares_end',
  'pool_end_before_deposit', 'deposit_next', 'price_end', 'G', 'E_calc', 'V_i'
];

/**
 * Parse CSV file content and validate for VR Simulator history records.
 * @param {string} csvContent - Raw CSV string
 * @returns {{ success: boolean, records: Object[], error: string|null }}
 */
export function parseCSV(csvContent) {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = result.data;

  if (!rows || rows.length === 0) {
    return { success: false, records: [], error: 'CSV 파일에 데이터가 없습니다.' };
  }

  const columns = Object.keys(rows[0]);
  const missingColumns = REQUIRED_COLUMNS.filter((col) => !columns.includes(col));
  if (missingColumns.length > 0) {
    return {
      success: false,
      records: [],
      error: 'CSV 파일에 필요한 컬럼이 모두 존재하지 않습니다.',
    };
  }

  const records = [];

  for (const row of rows) {
    const parsed = { ...row };

    for (const col of NUMERIC_COLUMNS) {
      const val = parseFloat(row[col]);
      if (isNaN(val)) {
        return {
          success: false,
          records: [],
          error: `CSV 오류: '${col}' 컬럼에 유효하지 않은 값이 있습니다.`,
        };
      }
      parsed[col] = val;
    }

    parsed['cycle_num'] = parseInt(row['cycle_num'], 10);

    if (parsed['price_end'] <= 0) {
      return {
        success: false,
        records: [],
        error: "CSV 오류: 'price_end'에 0 이하의 값이 있습니다.",
      };
    }

    if (parsed['G'] < 1) {
      return {
        success: false,
        records: [],
        error: "CSV 오류: 'G' 값은 1 이상이어야 합니다.",
      };
    }

    records.push(parsed);
  }

  return { success: true, records, error: null };
}

/**
 * Export history array to a CSV Blob.
 * @param {Object[]} history - Array of cycle record objects
 * @returns {{ blob: Blob, filename: string }}
 */
export function exportCSV(history) {
  const csvString = Papa.unparse(history);
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const filename = `${yyyy}${mm}${dd}_vr_simulation_history.csv`;

  return { blob, filename };
}

/**
 * Trigger a browser download for a given Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

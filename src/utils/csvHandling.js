/**
 * CSV handling utilities for import/export functionality
 */

import Papa from 'papaparse';

/**
 * Required columns for VR simulation history CSV
 */
export const REQUIRED_CSV_COLUMNS = [
  'cycle_num',
  'V_target',
  'LBand',
  'HBand',
  'shares_end',
  'pool_end_before_deposit',
  'deposit_next',
  'price_end',
  'G',
  'E_calc',
  'V_i'
];

/**
 * Parse CSV file for VR simulation history
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Parsed history data
 */
export function parseCSVFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value, field) => {
        // Convert numeric fields
        if (REQUIRED_CSV_COLUMNS.includes(field) && field !== 'cycle_num') {
          return parseFloat(value) || 0;
        }
        if (field === 'cycle_num') {
          return parseInt(value) || 0;
        }
        return value;
      },
      complete: (results) => {
        try {
          const data = results.data;
          
          // Validate required columns
          if (data.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }
          
          const csvColumns = Object.keys(data[0]);
          const missingColumns = REQUIRED_CSV_COLUMNS.filter(col => !csvColumns.includes(col));
          
          if (missingColumns.length > 0) {
            reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
            return;
          }
          
          // Validate data integrity
          const validatedData = data.map((row, index) => {
            const validatedRow = {};
            REQUIRED_CSV_COLUMNS.forEach(col => {
              const value = row[col];
              if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
                throw new Error(`Invalid value in row ${index + 1}, column ${col}`);
              }
              validatedRow[col] = value;
            });
            return validatedRow;
          });
          
          resolve(validatedData);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

/**
 * Convert history data to CSV format
 * @param {Array} historyData - VR simulation history
 * @returns {string} CSV string
 */
export function convertToCSV(historyData) {
  if (!historyData || historyData.length === 0) {
    return '';
  }
  
  const csv = Papa.unparse(historyData, {
    header: true,
    columns: REQUIRED_CSV_COLUMNS
  });
  
  return csv;
}

/**
 * Download data as CSV file
 * @param {Array} historyData - Data to download
 * @param {string} filename - Filename for download
 */
export function downloadCSV(historyData, filename = 'vr_simulation_history.csv') {
  const csvString = convertToCSV(historyData);
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validate individual history entry
 * @param {Object} entry - History entry to validate
 * @returns {boolean} Whether entry is valid
 */
export function validateHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  
  return REQUIRED_CSV_COLUMNS.every(col => {
    const value = entry[col];
    if (col === 'cycle_num') {
      return Number.isInteger(value) && value >= 0;
    }
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  });
}

/**
 * Create initial history entry
 * @param {number} shares - Initial shares
 * @param {number} price - Initial price
 * @param {number} pool - Initial pool
 * @param {number} G - Initial G value
 * @param {number} deposit - Default deposit
 * @returns {Object} Initial history entry
 */
export function createInitialHistoryEntry(shares, price, pool, G, deposit) {
  const V0 = shares * price;
  const { LBand, HBand } = calculateBands(V0);
  
  return {
    cycle_num: 0,
    V_target: V0,
    LBand,
    HBand,
    shares_end: shares,
    pool_end_before_deposit: pool,
    deposit_next: deposit,
    price_end: price,
    G,
    E_calc: V0,
    V_i: V0
  };
}

// Import VR calculation function
function calculateBands(V_target) {
  return {
    LBand: 0.85 * V_target,
    HBand: 1.15 * V_target
  };
}

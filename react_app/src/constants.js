// --- VR Version ---
export const VR_VERSION = "3.1.3";

// --- VR Parameter Constants ---
export const BASE_BAND_LOWER = 0.85;  // Default LBand ratio
export const BASE_BAND_UPPER = 1.15;  // Default HBand ratio
export const MIN_BAND_LOWER = 0.92;   // Min (compressed) LBand ratio
export const MAX_BAND_UPPER = 1.08;   // Max (compressed) HBand ratio
export const VE_DIVERGENCE_THRESHOLD = 0.05; // V/E divergence threshold (compression starts above 5%)
export const VE_MAX_DIVERGENCE = 0.50;       // Max divergence (full compression at 50%)
export const MAX_V_E_RATIO = 1.15;           // V/E ratio cap: V cannot exceed 115% of E

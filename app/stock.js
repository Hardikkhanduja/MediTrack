/**
 * MediTrack — Stock Status System
 *
 * Pure logic helpers. No UI, no imports.
 * Import getStockStatus() wherever stock state is needed.
 *
 * Thresholds:
 *   critical  : quantity <= 2   ("Refill soon")
 *   low       : quantity <= 5   ("Low stock")
 *   healthy   : quantity >  5   (silent — no indicator)
 */

export const STOCK_THRESHOLDS = {
  critical: 2,
  low: 5,
};

/**
 * Returns stock state for a given quantity.
 * @param {number} quantity
 * @returns {{ label: string, color: string, bg: string, isCritical: boolean, isLow: boolean, isHealthy: boolean }}
 */
export function getStockStatus(quantity) {
  const qty = parseInt(quantity) || 0;

  if (qty <= STOCK_THRESHOLDS.critical) {
    return {
      label:      "Refill soon",
      color:      "#e05555",
      bg:         "#1e0e0e",
      borderColor:"#3a1515",
      isCritical: true,
      isLow:      true,
      isHealthy:  false,
    };
  }

  if (qty <= STOCK_THRESHOLDS.low) {
    return {
      label:      "Low stock",
      color:      "#c9940a",
      bg:         "#1e1608",
      borderColor:"#3a2a10",
      isCritical: false,
      isLow:      true,
      isHealthy:  false,
    };
  }

  return {
    label:      null,
    color:      null,
    bg:         null,
    borderColor:null,
    isCritical: false,
    isLow:      false,
    isHealthy:  true,
  };
}

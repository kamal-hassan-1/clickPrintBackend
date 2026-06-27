/**
 * cost.js — Print job cost calculator
 *
 * Price config format:
 * {
 *   baseRates: {
 *     pageType: { A4: 10, A3: 20 },
 *     color:    { true: 15, false: 0 }
 *   },
 *   combinationRates: [
 *     // Overrides the summed base rates when ALL keys match.
 *     // Only the keys listed in `match` are checked; others are ignored.
 *     { match: { pageType: "A4", color: "true"  }, rate: 22 },
 *     { match: { pageType: "A3", color: "true"  }, rate: 40 },
 *     { match: { pageType: "A3", color: "false" }, rate: 25 }
 *   ]
 * }
 *
 * Rate resolution order (highest priority first):
 *   1. combinationRates — most specific match (most keys) wins
 *   2. sum of baseRates for each dimension present in the job
 */

// ---------------------------------------------------------------------------
// Page selection parser
// ---------------------------------------------------------------------------

/**
 * Parse a page-selection string such as "1,3,16-20,25" and return the
 * total count of unique pages selected.
 *
 * Supported syntax:
 *   - Single page:   "5"
 *   - Range:         "16-20"  (inclusive on both ends)
 *   - Comma-sep mix: "1,3,16-20,25"
 *
 * @param {string} selection
 * @returns {number} total unique page count
 */
function countPages(selection) {
  if (!selection || typeof selection !== "string") {
    throw new Error("pageSelection must be a non-empty string");
  }

  const pages = new Set();

  for (const token of selection.split(",")) {
    const part = token.trim();
    if (!part) continue;

    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end   = parseInt(endStr,   10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
        throw new Error(`Invalid page range: "${part}"`);
      }
      for (let p = start; p <= end; p++) pages.add(p);
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1) {
        throw new Error(`Invalid page number: "${part}"`);
      }
      pages.add(page);
    }
  }

  return pages.size;
}

// ---------------------------------------------------------------------------
// Rate resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the per-sheet rate from the price config for a given combination
 * of job attributes.
 *
 * @param {{ pageType: string, color: boolean }} attrs
 * @param {object} priceConfig
 * @returns {number}
 */
function resolveRate(attrs, priceConfig) {
  const { baseRates = {}, combinationRates = [] } = priceConfig;

  // Normalise keys to strings for comparison (JSON keys are strings)
  const normAttrs = Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k, String(v)])
  );

  // --- Try combination overrides first ---
  // Among all matching combinations pick the most specific (most keys matched)
  let bestMatch = null;
  let bestMatchCount = -1;

  for (const combo of combinationRates) {
    const { match, rate } = combo;
    if (!match || rate == null) continue;

    const entries = Object.entries(match);
    const allMatch = entries.every(([k, v]) => normAttrs[k] === String(v));

    if (allMatch && entries.length > bestMatchCount) {
      bestMatch = rate;
      bestMatchCount = entries.length;
    }
  }

  if (bestMatch !== null) return bestMatch;

  // --- Fall back to summing base rates ---
  let rate = 0;
  for (const [dimension, valueMap] of Object.entries(baseRates)) {
    const key = normAttrs[dimension];
    if (key !== undefined && valueMap[key] !== undefined) {
      rate += valueMap[key];
    }
  }
  return rate;
}

// ---------------------------------------------------------------------------
// Sheet calculation helpers
// ---------------------------------------------------------------------------

/**
 * Compute how many physical sheets are needed for a job.
 *
 * Logical pages → sheets pipeline:
 *   1. Start with raw page count from pageSelection.
 *   2. pagesPerSheet:  multiple logical pages fit on one side of a sheet.
 *   3. sidedness:      "long" or "short" = duplex → both sides used, halving sheets.
 *                      "none"            = simplex → one side only.
 *
 * @param {number} pageCount
 * @param {object} settings
 * @returns {number}
 */
function calculateSheets(pageCount, settings) {
  const { pagesPerSheet = 1, sidedness = "none" } = settings;

  // Pages printed per physical sheet (one side = pagesPerSheet, duplex = 2×)
  const pagesPerSheetNum = Math.max(1, parseInt(pagesPerSheet, 10));
  const sidesPerSheet    = sidedness === "long" || sidedness === "short" ? 2 : 1;
  const logicalPagesPerSheet = pagesPerSheetNum * sidesPerSheet;

  return Math.ceil(pageCount / logicalPagesPerSheet);
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Calculate the total cost for a print job.
 *
 * @param {object} settings
 * @param {string}  settings.pageType        "A4" | "A3"
 * @param {boolean} settings.color           true = colour, false = B&W
 * @param {string}  settings.orientation     ignored for costing ("landscape"|"portrait")
 * @param {string}  settings.sidedness       "none" | "long" | "short"
 * @param {number}  settings.pagesPerSheet   1 | 2 | 4 …
 * @param {string}  settings.pageSelection   e.g. "1,3,16-20,25"
 * @param {number}  settings.numberOfCopies
 *
 * @param {object} priceConfig  — see module-level JSDoc for format
 *
 * @returns {{
 *   pageCount:      number,
 *   sheetsPerCopy:  number,
 *   totalSheets:    number,
 *   ratePerSheet:   number,
 *   totalCost:      number
 * }}
 */
function calculateJobCost(settings, priceConfig) {
  const {
    pageType,
    color,
    sidedness      = "none",
    pagesPerSheet  = 1,
    pageSelection,
    numberOfCopies = 1,
  } = settings;

  // --- Validate required fields ---
  if (!pageType)       throw new Error("settings.pageType is required");
  if (color == null)   throw new Error("settings.color is required");
  if (!pageSelection)  throw new Error("settings.pageSelection is required");
  if (!priceConfig)    throw new Error("priceConfig is required");

  // --- 1. Count logical pages ---
  const pageCount = countPages(pageSelection);

  // --- 2. Determine sheets needed per copy ---
  const sheetsPerCopy = calculateSheets(pageCount, { pagesPerSheet, sidedness });

  // --- 3. Total sheets across all copies ---
  const totalSheets = sheetsPerCopy * numberOfCopies;

  // --- 4. Look up rate ---
  const ratePerSheet = resolveRate({ pageType, color }, priceConfig);

  // --- 5. Total cost ---
  const totalCost = totalSheets * ratePerSheet;

  return {
    pageCount,
    sheetsPerCopy,
    totalSheets,
    ratePerSheet,
    totalCost,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { calculateJobCost, countPages };

// ---------------------------------------------------------------------------
// Quick smoke-test (runs only when executed directly: node cost.js)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const priceConfig = {
    baseRates: {
      pageType: { A4: 10, A3: 20 },
      color:    { true: 15, false: 0 },
    },
    combinationRates: [
      // Colour A4 is cheaper than base sum (10+15=25) due to volume deal
      { match: { pageType: "A4", color: "true"  }, rate: 22 },
      { match: { pageType: "A3", color: "true"  }, rate: 40 },
      { match: { pageType: "A3", color: "false" }, rate: 25 },
    ],
  };

  const settings = {
    pageType:        "A4",
    color:           true,
    orientation:     "landscape",   // ignored
    sidedness:       "long",        // duplex
    pagesPerSheet:   2,
    pageSelection:   "1,3,16-20,25",
    numberOfCopies:  5,
  };

  // pageSelection "1,3,16-20,25"
  //   → pages: 1, 3, 16,17,18,19,20, 25  → 8 pages
  //   pagesPerSheet=2, duplex (×2 sides)  → 4 logical pages per sheet
  //   sheetsPerCopy = ceil(8/4) = 2
  //   totalSheets   = 2 × 5 copies = 10
  //   rate          = 22 (A4+colour combination override)
  //   totalCost     = 10 × 22 = 220

  const result = calculateJobCost(settings, priceConfig);
  console.log("Job cost breakdown:", result);
  // Expected: { pageCount:8, sheetsPerCopy:2, totalSheets:10, ratePerSheet:22, totalCost:220 }
}
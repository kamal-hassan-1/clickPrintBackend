const File = require('../models/File');

// -------------------------------------------------------------------------- //

// Flat fee added to every job, in the same currency unit as price rates.
const SERVICE_FEE = 10;

// -------------------------------------------------------------------------- //

// Counts how many pages a `pageSelection` string actually targets.
// Accepts comma separated singles and ranges, e.g. "1,3,16-20,25".
// Empty / "all" means every page. Out of range pages are clamped away and
// duplicates are ignored. Falls back to the whole document if nothing valid
// was selected.
function countSelectedPages(selection, totalPages) {
  if (!selection || String(selection).trim().toLowerCase() === 'all') {
    return totalPages;
  }

  const pages = new Set();

  for (const part of String(selection).split(',')) {
    const token = part.trim();
    if (!token) continue;

    if (token.includes('-')) {
      let [start, end] = token.split('-').map(Number);
      if (Number.isNaN(start) || Number.isNaN(end)) continue;
      if (start > end) [start, end] = [end, start];
      for (let p = start; p <= end; p++) {
        if (p >= 1 && p <= totalPages) pages.add(p);
      }
    } else {
      const p = Number(token);
      if (!Number.isNaN(p) && p >= 1 && p <= totalPages) pages.add(p);
    }
  }

  return pages.size || totalPages;
}

// Normalizes a draft file's settings into the flat shape that price `keys`
// are matched against. This bridges the naming differences between the two:
// settings use `color`, prices use `colored`; settings express sidedness as
// "single" / "long" / "short", prices express it as a boolean (double = true).
function normalizeSettings(settings) {
  return {
    color: !!settings.color,
    colored: !!settings.color,
    pageType: settings.pageType,
    orientation: settings.orientation,
    pagesPerSheet: settings.pagesPerSheet,
    sidedness: settings.sidedness !== 'single',
  };
}

// A price applies to a file when every key it declares matches the file's
// (normalized) settings. A price with no keys matches everything.
function priceMatches(price, normalized) {
  return Object.entries(price.keys || {}).every(([key, value]) => normalized[key] === value);
}

// Picks the price for a file: the most specific match (most keys) wins, with
// the cheapest rate breaking ties. Throws when nothing matches, since a job
// that cannot be priced should not be created.
function selectPrice(prices, settings, fileIndex) {
  const normalized = normalizeSettings(settings);
  const matches = prices.filter(price => priceMatches(price, normalized));

  if (matches.length === 0) {
    throw new Error(`No matching price for file[${fileIndex}]`);
  }

  matches.sort((a, b) =>
    Object.keys(b.keys || {}).length - Object.keys(a.keys || {}).length ||
    a.rate - b.rate
  );

  return matches[0];
}

// How many physical sheets one copy of a file consumes, given how many pages
// are imposed per side and whether printing is double sided.
function sheetsPerCopy(selectedPages, settings) {
  const slotsPerSide = settings.pagesPerSheet || 1;
  const sidesPerSheet = settings.sidedness === 'single' ? 1 : 2;
  return Math.ceil(selectedPages / (slotsPerSide * sidesPerSheet));
}

// -------------------------------------------------------------------------- //

// Builds the cost breakdown for a set of draft files against a shop's prices.
//
//   files  - draft files: [{ fileId, settings }]
//   prices - the shop's Price documents: [{ name, rate, keys }]
//
// Returns { lines, extra, total } matching the draft `cost` sub schema:
//   lines: [ [label, sheets, rate, amount], ... ]
//   extra: [ [label, amount], ... ]
//   total: number
const calculateJobCost = async (files, prices) => {
  const fileIds = files.map(file => file.fileId);
  const fileDocs = await File.find({ fileId: { $in: fileIds } }).lean();
  const pageCounts = new Map(fileDocs.map(doc => [doc.fileId, doc.numberOfPages]));

  const lines = files.map((file, index) => {
    const totalPages = pageCounts.get(file.fileId);
    if (totalPages == null) {
      throw new Error(`Unknown file for file[${index}] (${file.fileId})`);
    }

    const price = selectPrice(prices, file.settings, index);
    const selectedPages = countSelectedPages(file.settings.pageSelection, totalPages);
    const sheets = sheetsPerCopy(selectedPages, file.settings) * (file.settings.numberOfCopies || 1);
    const amount = sheets * price.rate;

    return [price.name, sheets, price.rate, amount];
  });

  const extra = [
    ['Service Fee', SERVICE_FEE],
  ];

  const total =
    lines.reduce((sum, [, , , amount]) => sum + amount, 0) +
    extra.reduce((sum, [, amount]) => sum + amount, 0);

  return { lines, extra, total };
};

module.exports = { calculateJobCost };

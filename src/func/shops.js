function extrapolateCapabilities(prices = []) {
  const colorModes = new Set();
  const pageTypes = new Set();
  const sidedness = new Set();

  for (const { keys } of prices) {
    if (!keys) continue;
    colorModes.add(keys.colored ? "Color" : "Black&White");
    if (keys.pageType) pageTypes.add(keys.pageType.toUpperCase());
    if (keys.sidedness) sidedness.add("Double-Sided");
  }

  // Ordered: color modes, then page sizes, then sidedness extras
  return [...colorModes, ...pageTypes, ...sidedness];
}

module.exports = {
    extrapolateCapabilities
};
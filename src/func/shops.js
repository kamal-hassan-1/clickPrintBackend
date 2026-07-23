function extrapolateCapabilities(services = []) {
  const colorModes = new Set();
  const pageTypes = new Set();
  const sidedness = new Set();

  for (const item of services) {
    const keys = item && item.keys ? item.keys : item;
    if (!keys) continue;
    if (keys.colored !== undefined) {
      colorModes.add(keys.colored ? 'color' : 'bw');
    }
    if (keys.pageType) {
      pageTypes.add(String(keys.pageType).toLowerCase());
    }
    if (keys.sidedness) {
      sidedness.add('duplex');
    }
  }

  // Ordered: color modes, then page sizes, then sidedness extras
  return [...colorModes, ...pageTypes, ...sidedness];
}

module.exports = {
  extrapolateCapabilities,
};
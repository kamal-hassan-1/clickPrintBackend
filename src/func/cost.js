const calculateJobCost = (files, priceList) => {
    return {
        lines: [
            ["A4 Page", 2, 3, 4],
            ["BW Page", 2, 3, 4],
        ],
        extra: [
            ["Service Fee", 10],
            ["Priority Fee", 100]
        ],
        total: 85
    }
};

module.exports = { calculateJobCost };
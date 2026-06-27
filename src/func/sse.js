const sseClients = new Map();

function notifyShopOnJobsUpdate(shopId) {
    if (!sseClients.has(shopId)) return;
    sseClients.get(shopId).write(`event: jobsUpdate\ndata: \n\n`);
}

module.exports = { sseClients, notifyShopOnJobsUpdate };
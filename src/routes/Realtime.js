// -------------------------------------------------------------------------- //

// const { sseClients } = require('../func/sse');

// router.patch('/:shopId/isOnline', validateObjectIds('shopId'), async (req, res) => {
//   if (!req.token.sid || req.token.sid !== req.params.shopId) return resp(res, 403, 'forbidden');
//   if (!sseClients.get(req.token.sid)) return resp(res, 400, 'shop must be connected to sse to update');

//   const shop = await Shop.findByIdAndUpdate(
//     req.params.shopId,
//     { isOnline: true, lastSeen: new Date() },
//     { returnDocument: 'after' }
//   );

//   if (!shop) return resp(res, 404, 'not found');
//   return resp(res, 200, 'isOnline updated', { shop });
// });
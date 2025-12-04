const r = require('express').Router();
const c = require('../controllers/reports');
const { verifyToken } = require('../middleware/auth');
r.get('/loan/:id/payments', verifyToken, c.paymentsForLoan);
r.get('/all', verifyToken, c.allData);
module.exports = r;

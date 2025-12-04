const { Loan, Payment } = require('../models');

exports.paymentsForLoan = async (req, res) => {
  try {
    const loanId = req.params.id;
    const payments = await Payment.findAll({ where: { loanId }});
    res.json(payments);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.allData = async (req, res) => {
  try {
    const loans = await Loan.findAll();
    res.json({ loans });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

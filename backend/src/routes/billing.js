import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getBilling, upsertBilling, getPayments, addPayment, deletePayment, getBillingOverview, getAllClientsBilling } from '../controllers/billingController.js';

const r = Router();
r.use(verifyToken);

r.get('/',         getAllClientsBilling);
r.get('/overview', getBillingOverview);

r.get('/:clientId',         getBilling);
r.put('/:clientId',         upsertBilling);

r.get('/:clientId/payments',  getPayments);
r.post('/:clientId/payments', addPayment);
r.delete('/payments/:id',     deletePayment);

export default r;

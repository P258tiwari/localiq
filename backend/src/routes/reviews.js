import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getReviews, getReview, createReview, updateReview, deleteReview,
  suggestReply, saveReply, getStats
} from '../controllers/reviewController.js';

const r = Router();
r.use(verifyToken);

// Static before /:id
r.get('/stats', getStats);

r.get('/',       getReviews);
r.post('/',      createReview);
r.get('/:id',    getReview);
r.put('/:id',    updateReview);
r.delete('/:id', deleteReview);

r.post('/:id/suggest-reply', suggestReply);
r.post('/:id/reply',         saveReply);

export default r;

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import {
  getKeywords, generateKeywordsForClient, selectKeywords,
  addKeyword, bulkAddKeywords, updateKeyword, deleteKeyword,
} from '../controllers/keywordsController.js';

const r = Router();
r.use(verifyToken);

// Specific sub-routes must come before the generic /:clientId
r.post('/:clientId/generate', generateKeywordsForClient);
r.post('/:clientId/select',   selectKeywords);
r.post('/:clientId/bulk',     bulkAddKeywords);

r.get('/:clientId',  getKeywords);
r.post('/:clientId', addKeyword);

r.put('/:id',    updateKeyword);
r.delete('/:id', deleteKeyword);

export default r;

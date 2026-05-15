import { Router } from 'express';
import { verifyToken, requireAdmin } from '../middleware/auth.js';
import {
  getClients, getClient, createClient, updateClient, deleteClient,
  getClientSeo, updateClientSeo, getMapsInfo, updateMapsInfo,
  getStatsOverview, calculateScore, uploadClientLogo
} from '../controllers/clientController.js';
import { getNotes, addNote, deleteNote } from '../controllers/notesController.js';
import { uploadLogo } from '../middleware/upload.js';

const r = Router();
r.use(verifyToken);

r.get('/stats/overview', getStatsOverview);

r.get('/',    getClients);
r.post('/',   createClient);

r.get('/:id',              getClient);
r.put('/:id',              updateClient);
r.delete('/:id',           deleteClient);

r.get('/:id/seo',          getClientSeo);
r.put('/:id/seo',          updateClientSeo);

r.get('/:id/maps-info',    getMapsInfo);
r.put('/:id/maps-info',    updateMapsInfo);

r.post('/:id/calculate-score', calculateScore);
r.post('/:id/logo', uploadLogo, uploadClientLogo);

r.get('/:clientId/notes',          getNotes);
r.post('/:clientId/notes',         addNote);
r.delete('/:clientId/notes/:noteId', deleteNote);

export default r;

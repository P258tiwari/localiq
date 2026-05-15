import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notificationsController.js';

const r = Router();
r.use(verifyToken);

r.get('/',                   getNotifications);
r.post('/mark-all-read',     markAllRead);
r.patch('/:id/read',         markRead);
r.delete('/:id',             deleteNotification);

export default r;

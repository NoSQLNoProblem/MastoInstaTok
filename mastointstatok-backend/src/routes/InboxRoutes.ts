import { Router } from 'express';
import { postToInbox } from '../controllers/InboxController';

const router = Router();

router.post('/users/:username/inbox', postToInbox);

export default router;

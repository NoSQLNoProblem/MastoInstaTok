import express from 'express';
import { ensureAuthenticated } from '../lib/authentication';
export const UserRouter = express.Router();

UserRouter.get('/users/me', ensureAuthenticated, (req, res) => {
    res.json(req.user);
}
);


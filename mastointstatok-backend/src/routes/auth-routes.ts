import passport from 'passport';
import express from 'express';
export const AuthRouter = express.Router();

AuthRouter.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

AuthRouter.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

AuthRouter.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});
import passport, { type Profile } from 'passport';
import express from 'express';
export const AuthRouter = express.Router();

AuthRouter.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

AuthRouter.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => res.redirect('http://localhost:3000/auth/callback')
);

AuthRouter.post('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to destroy session.' });
      }
      res.clearCookie('connect.sid'); // The default session cookie name
      res.status(200).json({ message: 'Successfully logged out.' });
    });
  });
});

AuthRouter.get('/auth/failure', (req, res) => {
  res.status(401).json({ message: 'Authentication failed.' });
});
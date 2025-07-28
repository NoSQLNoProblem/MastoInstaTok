import express from 'express';
import {ActivityPubRouter, apex} from './routes/activity-pub-routes';
import { AuthRouter } from './routes/auth-routes';
import session from 'express-session';
import passport from 'passport';
import 'dotenv/config';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { UserRouter } from './routes/user-routes';
import { findOrCreateUser } from './services/user-service';

const app = express();
app.use(express.json());

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.use(
  express.json({ type: apex.consts.jsonldTypes }),
  express.urlencoded({ extended: true }),
  apex
)

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  // create or find the user
  await findOrCreateUser(profile);
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use(ActivityPubRouter);
app.use(AuthRouter);
app.use(UserRouter);

// custom side-effect routes
app.on('apex-outbox', msg => {
  if (msg.activity.type === 'Create') {
    console.log(`New ${msg.object.type} from ${msg.actor}`)
  }
})

app.on('apex-inbox', msg => {
  if (msg.activity.type === 'Create') {
    console.log(`New ${msg.object.type} from ${msg.actor} to ${msg.recipient}`)
  }
})

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
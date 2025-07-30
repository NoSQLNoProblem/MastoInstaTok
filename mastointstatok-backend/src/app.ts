import express from "express";
import cors from "cors";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import federation from "./federation.js";
import { AuthRouter } from "./routes/auth-routes.js";
import passport, { type Profile } from "passport";
import { Strategy as GoogleStrategy, type VerifyCallback } from 'passport-google-oauth20';
import session from 'express-session';
import 'dotenv/config'
import { CreateUser } from "./services/activity-pub/user-service.js";

const logger = getLogger("mastointstatok-backend");

export const app = express();

const clientOrigin = 'http://localhost:3000';
const clientApiPaths = ['/api/feed', '/api/auth/me', '/api/auth/logout', '/api/auth/google']; // Add the client paths here.

const corsOptionsDelegate = (req: express.Request, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
  let corsOptions;
  // Check if the request path is one of our client api routes
  if (clientApiPaths.some(path => req.path.startsWith(path))) {
    // If from client, use strict cors.
    corsOptions = { origin: clientOrigin, credentials: true };
  } else {
    // Otherwise, it's a public/federated route, so allow any origin.
    // This is necessary for server-to-server communication in ActivityPub.
    corsOptions = { origin: '*' };
  }
  callback(null, corsOptions); 
};

app.use(cors(corsOptionsDelegate));

app.set("trust proxy", true);

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  callbackURL: '/api/auth/google/callback',
  passReqToCallback: true,
}, async (req, accessToken:string, refreshToken:string, profile:Profile, done:VerifyCallback) => {
  // create user if they don't already exist in our system
  await CreateUser(profile, `${req.protocol}://${req.get('host')}`);
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user as Express.User));
passport.deserializeUser((obj, done) => done(null, obj as Express.User));
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());

app.use(integrateFederation(federation, (req) =>  req.user));
app.use("/api", AuthRouter);

export default app;

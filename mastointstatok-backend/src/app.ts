import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import federation from "./federation.js";
import { AuthRouter } from "./routes/auth-routes.js";
import passport, { type Profile } from "passport";
import { Strategy as GoogleStrategy, type VerifyCallback } from 'passport-google-oauth20';
import session from 'express-session';
import 'dotenv/config'
import { CreateUser } from "./services/user-service.js";
import { UserRouter } from "./routes/user-routes.js";

const logger = getLogger("mastointstatok-backend");

export const app = express();

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req) =>  req.user));
app.use(express.json())

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  callbackURL: '/api/auth/google/callback',
  passReqToCallback: true,
}, async (req, accessToken:string, refreshToken:string, profile:Profile, done:VerifyCallback) => {
  await CreateUser(profile, `${req.protocol}://${req.get('host')}`);
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user as Express.User));
passport.deserializeUser((obj, done) => done(null, obj as Express.User));

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false })); // Get this secret from env asap

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", AuthRouter);
app.use("/api", UserRouter);

export default app;

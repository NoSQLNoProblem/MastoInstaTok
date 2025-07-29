import express from "express";
import { integrateFederation } from "@fedify/express";
import { getLogger } from "@logtape/logtape";
import federation from "./federation.ts";
import { AuthRouter } from "./routes/auth-routes.ts";
import passport, { type Profile } from "passport";
import { Strategy as GoogleStrategy, type VerifyCallback } from 'passport-google-oauth20';
import session from 'express-session';
import 'dotenv/config'
import { CreateUser } from "./services/user-service.ts";
const logger = getLogger("mastointstatok-backend");

export const app = express();

app.set("trust proxy", true);

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  callbackURL: '/auth/google/callback'
}, async (accessToken:string, refreshToken:string, profile:Profile, done:VerifyCallback) => {
  // create or find the user
  await CreateUser(profile);
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user as Express.User));
passport.deserializeUser((obj, done) => done(null, obj as Express.User));
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

app.use(passport.initialize());
app.use(passport.session());
app.use(integrateFederation(federation, (req) =>  req.user));

app.use(AuthRouter);


app.get("/", (req, res) => res.send("Hello, Fedify!"));

export default app;

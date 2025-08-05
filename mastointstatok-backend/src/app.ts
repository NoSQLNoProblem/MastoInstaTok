import express from "express"
import { integrateFederation } from "@fedify/express"
import { getLogger } from "@logtape/logtape"
import federation from "./federation.js"
import { AuthRouter } from "./routes/auth-routes.js"
import { LikesRouter } from "./routes/likes-routes.js"
import { UserRouter } from "./routes/user-routes.js"
import { CommentsRouter } from "./routes/comments-routes.js"
import passport, { type Profile } from "passport"
import { Strategy as GoogleStrategy, type VerifyCallback } from "passport-google-oauth20"
import session from "express-session"
import "dotenv/config"
import { CreateUser } from "./services/user-service.js"
import { FindUser, FindUserByUri } from "./database/user-queries.js" 
import cors from "cors";
import { errorHandler } from "./middleware/error-middleware.js";
import { PostRouter } from "./routes/post-routes.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { configure, getConsoleSink } from "@logtape/logtape";
import { MongoCryptCreateEncryptedCollectionError } from "mongodb"
import { Like } from "@fedify/fedify"

const logger = getLogger("mastointstatok-backend")

export const app = express()

await configure({
  sinks: { console: getConsoleSink() },
  loggers: [
    { category: "your-app", sinks: ["console"], lowestLevel: "debug" },
    { category: "fedify",   sinks: ["console"], lowestLevel: "error" },
  ],
  contextLocalStorage: new AsyncLocalStorage(),
});

const allowedOrigins = ['http://localhost:3000', 'https://bbd-grad-project.co.za'];
    app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req) =>  req.user));
app.use(express.json({ limit: '10mb' }))

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      callbackURL: "/api/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        await CreateUser(profile, `${req.protocol}://${req.get("host")}`)
        return done(null, profile)
      } catch (error) {
        return done(error)
      }
    },
  ),
)

passport.serializeUser((user: any, done) => {
  console.log("=== SERIALIZE USER DEBUG ===")  //TODO: cleanup on isle whatever this is. 
  console.log("User object to serialize:", user)
  done(null, user.actorId)
})

passport.serializeUser((user, done) => done(null, user as Express.User));
passport.deserializeUser((obj, done) => done(null, obj as Express.User));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
  }),
)
app.use(passport.initialize())
app.use(passport.session())
app.use("/api", AuthRouter, errorHandler);
app.use("/api", UserRouter, errorHandler);
app.use("/api", PostRouter, errorHandler)
app.use("/api", CommentsRouter, errorHandler);
app.use("/api", LikesRouter, errorHandler);

export default app

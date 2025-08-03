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
import { FindUser } from "./database/user-queries.js" 
import cors from "cors";
import { errorHandler } from "./middleware/error-middleware.js";
import { PostRouter } from "./routes/post-routes.js";
import { MongoCryptCreateEncryptedCollectionError } from "mongodb"
import { Like } from "@fedify/fedify"

const logger = getLogger("mastointstatok-backend")

export const app = express()



const allowedOrigins = ['http://localhost:3000', 'https://bbd-grad-project.co.za'];
    app.use(cors({
      origin: allowedOrigins,
      credentials: true
    }));

app.set("trust proxy", true);

app.use(integrateFederation(federation, (req) =>  req.user));
app.use(express.json({ limit: '10mb' }))

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  callbackURL: '/api/auth/google/callback',
  passReqToCallback: true,
}, async (req, accessToken:string, refreshToken:string, profile:Profile, done:VerifyCallback) => {
  await CreateUser(profile, `${req.protocol}://${req.get('host')}`);
  return done(null, profile);
}));

passport.serializeUser((user: any, done) => {
  done(null, user.googleId)
})

passport.deserializeUser(async (googleId: string, done) => {

  try {
    const user = await FindUser({ id: googleId } as Profile)
    console.log("User found by FindUser (deserialize):", user)

    if (user) {
      done(null, user)
    } else {
      console.log("User not found in DB during deserialization for googleId:", googleId)
      done(null, false)
    }
  } catch (error) {
    console.error("Error during deserializeUser:", error)
    done(error, null)
  }
})

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax",
    },
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

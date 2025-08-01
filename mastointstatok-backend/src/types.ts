import type { Follow } from "@fedify/fedify";

export type User = {
    googleId ?: string,
    email ?: string | undefined
    displayName: string | null,
    actorId: string,
    bio : string | null,
    username ?: string
    fullHandle : string
  };

export type Follower = {
  uri : string,
  inboxUri : string,
  actorId : string
}

export type Following = {
  followerId : string,
  followeeId : string,
  inboxUri : string
}

export type AcceptObject = {
  id : URL,
  actor : URL,
  object : Follow,
  to: URL
}

export type FollowObject = {
  id: string,
  actor: string,
  object : string
}
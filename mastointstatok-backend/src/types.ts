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
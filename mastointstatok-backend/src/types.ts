export type UserDocument = {
    googleId: string,
    email: string | undefined
    displayName: string | null,
    actorId: string,
    bio : string | null,
    username: string
  };

export type FollowerDocument = {
  uri : string,
  inboxUri : string,
  actorId : string
}
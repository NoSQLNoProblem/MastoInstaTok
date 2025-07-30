export type User = {
  _id: string ,
  googleId: string,
  email: string,
  displayName: string,
  actorId: string
}

export type UserDocument = {
    googleId: string,
    email: string
    displayName: string,
    actorId: string,
  };

export type Actor = {
  uri : string,
  inboxUri : string
}

export type FollowerDocument = {
  uri : string,
  inboxUri : string,
  actorId : string
}
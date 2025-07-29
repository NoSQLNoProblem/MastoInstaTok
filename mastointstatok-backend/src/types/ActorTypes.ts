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
    followers: string[]
  };
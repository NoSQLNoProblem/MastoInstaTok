import type { Profile } from 'passport';
import { client } from '../lib/mongo.js';

client.connect();
const db = client.db("app_db");

export async function CreateUser(profile : Profile) {
 
  const usersCollection = db.collection('users');

  let user = await usersCollection.findOne({ googleId: profile.id });
  console.log(user)
  if (user) return user;

  const username = profile.displayName.toLowerCase().replace(/\s+/g, '');
  const actorId = GetActorId(username);

  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName,
    actorId: actorId,
  };

  return await usersCollection.insertOne(userToInsert);
}

export async function FindUser(profile : Profile)
{
   const usersCollection = db.collection('users');
   let user = await usersCollection.findOne({ googleId: profile.id });
   return user;
}

export async function FindUserByUsername(username : string){
   const usersCollection = db.collection('users');
   const actorId = GetActorId(username);
   console.log("trying to find ", actorId)
   return await usersCollection.findOne({actorId})
}

const GetActorId = (username: string) => `https://${process.env.BASE_API_URL}/users/${username}`



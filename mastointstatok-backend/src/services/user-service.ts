import { v4 as uuid } from 'uuid';
import { apex } from '../routes/activity-pub-routes';
import { db } from '../lib/mongo';

export async function findOrCreateUser(profile) {
  const usersCollection = db.collection('users');

  let user = await usersCollection.findOne({ googleId: profile.id });
  console.log(user)
  if (user) return user;

  const username = profile.displayName.toLowerCase().replace(/\s+/g, '') + '-' + uuid().slice(0, 6);
  const actorId = `https://${process.env.BASE_API_URL}/u/${username}`;

  const actor = {
    id: actorId,
    type: 'Person',
    preferredUsername: username,
    name: profile.displayName,
    inbox: `${actorId}/inbox`,
    outbox: `${actorId}/outbox`,
    followers: `${actorId}/followers`,
    following: `${actorId}/following`,
    liked: `${actorId}/liked`,
    publicKey: {
      id: `${actorId}#main-key`,
      owner: actorId,
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\n...' 
    }
  };
  
  await apex.store.db.collection('objects').insertOne(actor);

  const userToInsert = {
    googleId: profile.id,
    email: profile.emails?.[0]?.value,
    displayName: profile.displayName,
    actorId: actor.id,
  };

  return await usersCollection.insertOne(userToInsert);
}

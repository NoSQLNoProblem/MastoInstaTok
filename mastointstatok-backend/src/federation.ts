import { getLogger } from "@logtape/logtape";
import { Accept, Endpoints, InProcessMessageQueue, Undo, type Context, type Recipient } from "@fedify/fedify";
import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  Follow,
  Person,
} from "@fedify/fedify";
import { MongoKvStore } from "./lib/mongo-key-store.js";
import type { AcceptObject, Follower, FollowObject} from "./types.js";
import { type Request } from "express";
import { FindUserByUri } from "./database/user-queries.js";
import { AddFollower, getInternalUsersFollowersByUserId, getInternalUsersFollowingByUserId } from "./database/follow-queries.js";
import { getAcceptRecord, getFollowRecord, getUndoRecord, insertAcceptRecord, insertFollowRecord, insertUndoRecord } from "./database/object-queries.js";
import { ValidationError } from "./lib/errors.js";

const logger = getLogger("mastointstatok-backend");

export const federation = createFederation({
  kv: new MongoKvStore(),
  queue: new InProcessMessageQueue(),
});

const kv = new MongoKvStore();

federation.setActorDispatcher("/api/users/{identifier}", async (ctx, identifier) => {
  const user = await FindUserByUri((await ctx.getActorUri(identifier)).href);
  if (!user) return null;
  console.log("This line means that the web finger is making a request to object dispatcher");

  return new Person({
    id: new URL(user.actorId),
    preferredUsername: user.username,
    name: user.displayName,
    inbox: ctx.getInboxUri(identifier),
    followers: ctx.getFollowersUri(identifier),
    endpoints: new Endpoints({sharedInbox: ctx.getInboxUri()}),
    summary: user.bio,
    following: ctx.getFollowingUri(identifier),
    publicKeys: (await ctx.getActorKeyPairs(identifier))
      .map(keyPair => keyPair.cryptographicKey),
  });
}).setKeyPairsDispatcher(async (ctx, identifier) => {
  const entry = await kv.get<{rsaKeyPair:{
    privateKey: JsonWebKey
    publicKey: JsonWebKey
  },
  edKeyPair:{
    privateKey: JsonWebKey
    publicKey: JsonWebKey
  }}>(["key", identifier]);
  if (entry == null) {
    const { privateKey: rsaPrivKey, publicKey: rsaPubKey } =
      await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");

    const { privateKey: edPrivKey, publicKey: edPubKey } =
      await generateCryptoKeyPair("Ed25519");

    await kv.set(
      ["key", identifier],
      {rsaKeyPair: {
        privateKey: await exportJwk(rsaPrivKey),
        publicKey: await exportJwk(rsaPubKey),
      },edKeyPair: {
        privateKey: await exportJwk(edPrivKey),
        publicKey: await exportJwk(edPubKey),
      }}
    );
    return [{ privateKey: rsaPrivKey, publicKey: rsaPubKey }, {privateKey: edPrivKey, publicKey: edPubKey}];
  }
  const rsaPrivateKey = await importJwk(entry.rsaKeyPair.privateKey, "private");
  const rsaPublicKey = await importJwk(entry.rsaKeyPair.publicKey, "public");
  const edPrivateKey = await importJwk(entry.edKeyPair.privateKey, "private");
  const edPublicKey = await importJwk(entry.edKeyPair.publicKey, "public");

  return [{ privateKey : rsaPrivateKey, publicKey:rsaPublicKey}, { privateKey : edPrivateKey, publicKey:edPublicKey}];
})

federation
  .setFollowersDispatcher(
    "/api/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      if (cursor == null) return null;
      const { users, nextCursor, last } = await getInternalUsersFollowersByUserId(
        ctx.getActorUri(identifier).href,
        { cursor, limit: 10 }
      );
      const items: Recipient[] = users.map((actor: Follower) => ({
        id: new URL(actor.uri),
        inboxId: new URL(actor.inboxUri),
        endpoints: {
                    sharedInbox: actor.inboxUri ? new URL(actor.inboxUri) : null,
        },
      }));
      return { items, nextCursor: last ? null : nextCursor };
    }
  )
  .setFirstCursor((ctx, identifier) => Number.MAX_SAFE_INTEGER.toString());


federation
  .setFollowingDispatcher("/api/users/{identifier}/follows", 
    async (ctx, identifier, cursor) => {
    if (cursor == null) return null;
    const { users: followings, nextCursor, last } = await getInternalUsersFollowingByUserId(
      identifier,
      { cursor, limit: 10 }
    );
    const items = followings.map(following => new URL(following.followeeId));
    return { items, nextCursor: last ? null : nextCursor }
  })
  .setFirstCursor(async (ctx, identifier) => Number.MAX_SAFE_INTEGER.toString());

federation
  .setInboxListeners("/api/users/{identifier}/inbox", "/api/inbox")
  .on(Follow, async (ctx, follow) => {
    console.log("Received a follow request")
    if (follow.id == null || follow.actorId == null || follow.objectId == null) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor") return; // TODO: Also check that the user actually exists on our system

    const follower = await follow.getActor(ctx);
    if (follower == null) return;
    const resourceGUID = crypto.randomUUID().split("-")[0]
    console.log("the sending identifier for a accept is")
    console.log(parsed.identifier)
    await ctx.sendActivity(
      { identifier: parsed.identifier },
      follower,
      new Accept({
         id : new URL(`${ctx.canonicalOrigin}/${follow.objectId}/accepts/${resourceGUID}`),
         actor: follow.objectId, 
         object: follow, 
         to: follow.actorId 
      }),
    );
    insertAcceptRecord({
         id : new URL(`${ctx.canonicalOrigin}/${follow.objectId}/accepts/${resourceGUID}`),
         actor: follow.objectId, 
         object: follow, 
         to: follow.actorId  
    })
    AddFollower(follow.objectId.href, follow.actorId.href, follower?.inboxId?.href ?? "")
  });

federation.setObjectDispatcher(
  Accept,
  "/users/{userId}/accept/{acceptId}",
  async (ctx, {userId, acceptId} ) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/accept/${acceptId}`);
    const acceptObject : AcceptObject | null = await getAcceptRecord(id);
    if (!acceptObject) return null;
    return new Accept({
      id: acceptObject.id,
      actor: acceptObject.actor,
      object: acceptObject.object,
      to: acceptObject.to
    });
  }
);

federation.setObjectDispatcher(Follow, 
  "/users/{userId}/follows/{followId}",
  async (ctx, { userId, followId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/accept/${followId}`);
    const followObject : FollowObject | null = await getFollowRecord(id); 
    if(!followObject || !followObject?.id || !followObject?.actor || !followObject?.object) return null;
    return new Follow({
      id: new URL(followObject?.id),
      actor: new URL(followObject?.actor),
      object: new URL(followObject?.object)
    });
  }
)

federation.setObjectDispatcher(Undo, 
  "/users/{userId}/undos/{undoId}",
  async (ctx, { userId, undoId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/accept/${undoId}`);
    const followObject : FollowObject | null = await getUndoRecord(id); 
    if(!followObject || !followObject?.id || !followObject?.actor || !followObject?.object) return null;
    return new Undo({
      id: new URL(followObject?.id),
      actor: new URL(followObject?.actor),
      object: new URL(followObject?.object)
    });
  }
)

export function createContext(request:Request){
  const url = `${request.protocol}://${request.header('Host') ?? request.hostname}`;
  console.log("CONEXT URL: " + url);
  return federation.createContext(new URL(url), undefined);
}

export async function sendFollow(
  ctx: Context<unknown>,
  senderId: string,
  recipient: Recipient,
) {
  const resourceGUID = crypto.randomUUID().split("-")[0]
  if(!recipient || !recipient.id) return false;

  const sender = ctx.parseUri(new URL(senderId));
  if(sender?.type !== "actor"){
    return false;
  }
  await ctx.sendActivity(
    { identifier: sender.identifier},
    recipient,
    new Follow({
      id: new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/follows/${resourceGUID}`),
      actor: ctx.getActorUri(sender.identifier),
      object: recipient.id,
    }),
  );

  insertFollowRecord({
    id: `${ctx.canonicalOrigin}/users/${senderId}/follows/${resourceGUID}`,
    actor: ctx.getActorUri(sender.identifier).href,
    object: recipient.id.href, 
  })

  return true;
}

export async function sendUnfollow(
  ctx: Context<unknown>,
  senderId: string,
  recipient: Recipient,
  followObject: FollowObject,
) {
  if(!followObject || !followObject.id) throw new ValidationError();
  if(!recipient.id) throw new ValidationError;
  const sender = ctx.parseUri(new URL(senderId));
  const resourceGUID = crypto.randomUUID().split("-")[0]

  if(sender?.type !== "actor"){
    return false;
  }
  await ctx.sendActivity(
    { identifier: sender.identifier},
    recipient,
    new Undo({
      id: new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/undos/${resourceGUID}`),
      actor: ctx.getActorUri(sender.identifier),
      object: new URL(followObject.id),
    }),
  );

  insertUndoRecord({
    id: `${ctx.canonicalOrigin}/users/${senderId}/undos/${resourceGUID}`,
    actor: ctx.getActorUri(sender.identifier).href,
    object: recipient.id.href, 
  })
  return true;
}

export default federation;

import { getLogger } from "@logtape/logtape";
import { Accept, Article, Create, Endpoints, InProcessMessageQueue, Note, OrderedCollection, type Recipient } from "@fedify/fedify";
import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  Follow,
  Person,
} from "@fedify/fedify";
import { MongoKvStore } from "./lib/mongo-key-store.js";
import { AddFollower, FindUser, FindUserByDisplayName, FindUserByUri, getFollowersByUserId } from "./services/user-service.js";
import type { FollowerDocument, UserDocument } from "./types.js";
import { type Request } from "express";

const logger = getLogger("mastointstatok-backend");

const federation = createFederation({
  kv: new MongoKvStore(),
  queue: new InProcessMessageQueue(),
});

const kv = new MongoKvStore();

federation.setActorDispatcher("/api/users/{identifier}", async (ctx, identifier) => {
  const user = await FindUserByUri((await ctx.getActorUri(identifier)).href);
  if (!user) return null;

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
      const { users, nextCursor, last } = await getFollowersByUserId(
        ctx.getActorUri(identifier).href,
        { cursor, limit: 10 }
      );
      console.log(ctx.getActorUri(identifier))
      console.log(users)
      const items: Recipient[] = users.map((actor: FollowerDocument) => ({
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

federation.setFollowingDispatcher("/api/users/{identifier}/following", async (ctx, identifier, cursor)=>{
  return null;
})

federation
  .setInboxListeners("/api/users/{identifier}/inbox", "/api/inbox")
  .on(Follow, async (ctx, follow) => {
    if (follow.id == null || follow.actorId == null || follow.objectId == null) {
      return;
    }
    const parsed = ctx.parseUri(follow.objectId);
    if (parsed?.type !== "actor") return; // TODO: Also check that the user actually exists on our system

    const follower = await follow.getActor(ctx);
    if (follower == null) return;
    await ctx.sendActivity(
      { identifier: parsed.identifier },
      follower,
      new Accept({ actor: follow.objectId, object: follow, to: follow.actorId }),
    );
    AddFollower(follow.objectId.href, follow.actorId.href, follower?.inboxId?.href ?? "")
  });

export function createContext(request:Request){
  const url = `${request.protocol}://${request.header('Host') ?? request.hostname}`;
  return federation.createContext(new URL(url), undefined);
}


export default federation;

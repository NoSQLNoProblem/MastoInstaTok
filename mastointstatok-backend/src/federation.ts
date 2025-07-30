import { getLogger } from "@logtape/logtape";
import { Accept, Article, Create, InProcessMessageQueue, Note, OrderedCollection, type Recipient } from "@fedify/fedify";
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
import type { Profile } from "passport";
import type { User } from "./types.js";

const logger = getLogger("mastointstatok-backend");

const federation = createFederation({
  kv: new MongoKvStore(),
  queue: new InProcessMessageQueue(),
});

const kv = new MongoKvStore();

federation.setActorDispatcher("/api/users/{identifier}", async (ctx, identifier) => {
  let user: User | undefined;
  if (identifier === "me") {
    if (!ctx.data) return null;
    user = await FindUser(ctx.data as Profile) as unknown as User;
  }
  else {
    user = await FindUserByUri((await ctx.getActorUri(identifier)).href) as unknown as User;
  }
  if (!user) return null;
  return new Person({
    id: new URL(user.actorId),
    preferredUsername: user.displayName,
    name: user.displayName,
    inbox: ctx.getInboxUri(identifier),
    followers: ctx.getFollowersUri(identifier),
    publicKeys: (await ctx.getActorKeyPairs(identifier))
      .map(keyPair => keyPair.cryptographicKey),
  });
}).setKeyPairsDispatcher(async (ctx, identifier) => {
  const entry = await kv.get<{
    privateKey: JsonWebKey;
    publicKey: JsonWebKey;
  }>(["key", identifier]);
  if (entry == null) {
    const { privateKey, publicKey } =
      await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");

    await kv.set(
      ["key", identifier],
      {
        privateKey: await exportJwk(privateKey),
        publicKey: await exportJwk(publicKey),
      }
    );
    return [{ privateKey, publicKey }];
  }
  const privateKey = await importJwk(entry.privateKey, "private");
  const publicKey = await importJwk(entry.publicKey, "public");
  return [{ privateKey, publicKey }];
}).mapHandle(async (ctx, username) => {
    // Work with the database to find the user's UUID by the WebFinger username.
    const user = await FindUserByDisplayName(username);
    if (user == null) return null;  // Return null if the actor is not found.
    return user.username;
  });;

federation
  .setFollowersDispatcher(
    "/api/users/{identifier}/followers",
    async (ctx, identifier, cursor) => {
      if (cursor == null) return null;
      const { users, nextCursor, last } = await getFollowersByUserId(
        ctx.getActorUri(identifier).href,
        { cursor, limit: 10 }
      );
      const items: Recipient[] = users.map((actor: any) => ({
        id: new URL(actor.uri),
        inboxId: new URL(actor.inboxUri),
      }));
      return { items, nextCursor: last ? null : nextCursor };
    }
  )
  .setFirstCursor(async (ctx, identifier) => "");

federation
  .setInboxListeners("/api/users/{identifier}/inbox", "/inbox")
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
      new Accept({ actor: follow.objectId, object: follow }),
    );
    AddFollower(follow.objectId.href, follow.actorId.href, follower?.inboxId?.href ?? "")
  });

export default federation;

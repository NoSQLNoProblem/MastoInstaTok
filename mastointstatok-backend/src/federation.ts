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
import { AddFollower, FindUser, FindUserByUri, getFollowersByUserId } from "./services/activity-pub/user-service.js";
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
});

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

const window = 10;

// federation
//   .setOutboxDispatcher("/users/{identifier}/outbox", async (ctx, identifier, cursor) => {
//     if (cursor == null) return null;
//     // Here we use the offset numeric value as the cursor:
//     const offset = parseInt(cursor);
//     // The following `getPostsByUserId` is a hypothetical function:
//     const posts = await getPostsByUserId(
//       identifier,
//       { offset, limit: window }
//     );
//     // Turn the posts into `Create` activities:
//     const items = posts.map((post:any) =>
//       new Create({
//         id: new URL(`/posts/${post.id}#activity`, ctx.url),
//         actor: ctx.getActorUri(identifier),
//         object: new Note({
//           id: new URL(`/posts/${post.id}`, ctx.url),
//           summary: post.title,
//           content: post.content,
//         }),
//       })
//     );
//     return { items, nextCursor: (offset + window).toString() }
//   })
//   .setFirstCursor(async (ctx, identifier) => "0")
//   .setLastCursor(async (ctx, identifier) => {
//     // The following `countPostsByUserId` is a hypothetical function:
//     const total = await countPostsByUserId(identifier);
//     // The last cursor is the offset of the last page:
//     return (total - (total % window)).toString();
//   });

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

import { getLogger } from "@logtape/logtape";
import { Accept, InProcessMessageQueue } from "@fedify/fedify";
import {
  createFederation,
  exportJwk,
  generateCryptoKeyPair,
  importJwk,
  Follow,
  Person,
  MemoryKvStore,
} from "@fedify/fedify";
import { MongoKvStore } from "./lib/mongo-key-store.ts";
import { AddFollower, FindUser, FindUserByUri} from "./services/user-service.ts";
import type { Profile } from "passport";
import type { User } from "./types/ActorTypes.ts";


const logger = getLogger("mastointstatok-backend");

const federation = createFederation({
  kv: new MongoKvStore(),
  queue: new InProcessMessageQueue(),
});

const kv = new MongoKvStore();

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  let user: User | undefined;
  if(identifier === "me"){
    if(!ctx.data) return null;
    user = await FindUser(ctx.data as Profile) as unknown as User;
  }
  else{
    user = await FindUserByUri((await ctx.getActorUri(identifier)).href) as unknown as User;
  }
  if (!user) return null;
  return new Person({
    id: new URL(user.actorId),
    preferredUsername: user.displayName,
    name: user.displayName,
    publicKeys: (await ctx.getActorKeyPairs(identifier))
        .map(keyPair => keyPair.cryptographicKey),
  });
}).setKeyPairsDispatcher(async (ctx, identifier) => {
    const entry = await kv.get<{
      privateKey: JsonWebKey;
      publicKey: JsonWebKey;
    }>(["key", identifier]);
    if (entry == null) {
      // Generate a new key pair at the first time:
      const { privateKey, publicKey } =
        await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");
      // Store the generated key pair to the Deno KV database in JWK format:
      await kv.set(
        ["key", identifier],
        {
          privateKey: await exportJwk(privateKey),
          publicKey: await exportJwk(publicKey),
        }
      );
      return [{ privateKey, publicKey }];
    }
    // Load the key pair from the Deno KV database:
    const privateKey = await importJwk(entry.privateKey, "private");
    const publicKey =  await importJwk(entry.publicKey, "public");
    return [{ privateKey, publicKey }];
  });


federation
  .setInboxListeners("/users/{identifier}/inbox", "/inbox")
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
    // Store the follower in the key–value store:
    AddFollower(follow.objectId.href, follow.actorId.href)
    await kv.set(["followers", follow.id.href], follow.actorId.href);
  });

export default federation;

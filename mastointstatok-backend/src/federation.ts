import { createFederation, Person } from "@fedify/fedify";
import { getLogger } from "@logtape/logtape";
import { InProcessMessageQueue } from "@fedify/fedify";
import { MongoKvStore } from "./lib/mongo-key-store.ts";
import { FindUser, FindUserByUsername } from "./services/user-service.ts";
import type { Profile } from "passport";
import type { User } from "./types/ActorTypes.ts";

const logger = getLogger("mastointstatok-backend");

const federation = createFederation({
  kv: new MongoKvStore(),
  queue: new InProcessMessageQueue(),
});

federation.setActorDispatcher("/users/{identifier}", async (ctx, identifier) => {
  let user: User | undefined;
  if(identifier === "me"){
    console.log("MEE");
    console.log(ctx.data);
    if(!ctx.data) return null;
    user = await FindUser(ctx.data as Profile) as unknown as User;
  }
  else{
    user = await FindUserByUsername(identifier) as unknown as User;
  }
  if (!user) return null;
  return new Person({
    id: new URL(user.actorId),
    preferredUsername: user.displayName,
    name: user.displayName,
  });
});

export default federation;

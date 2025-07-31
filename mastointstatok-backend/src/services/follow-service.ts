import { Link, type Actor, type OrderedCollection, type OrderedCollectionPage } from "@fedify/fedify";
import { createContext } from "../federation.js";
import { type Request } from "express";
import type { User } from "../types.js";

export async function GetFollowers(request: Request, userHandle: string, next?: string) {
  const ctx = createContext(request);
  const actor = await ctx.lookupObject(userHandle) as Actor;

  let followerPage;

  if (!next) {
    if (!actor.followersId) return []
    followerPage = await ((await ctx.lookupObject((actor.followersId)?.href)) as OrderedCollection).getFirst();
    if (followerPage == null) return [];

  } else {
    followerPage = await ctx.lookupObject(next) as OrderedCollectionPage;
  }

  const items: User[] = []

  try {
    for await (const item of followerPage.getItems()) {
      try {
        let resolvedItem;
        console.log(item)
        if (item instanceof Link) {
          if (!item.href) {
            continue;
          }
          resolvedItem = await ctx.lookupObject(item.href?.href);
          if (!resolvedItem || !resolvedItem.id) continue;
          resolvedItem as Actor;
          items.push({
            actorId: resolvedItem.id.href,
            bio: resolvedItem.summary as string,
            displayName: resolvedItem.name as string,
            fullHandle: `@${(resolvedItem as Actor).preferredUsername}@${(new URL(actor!.id!.href).host)})`
          })
          continue;
        }
        if (!item || !item.id) continue;
        items.push({
          actorId: item.id.href,
          bio: item.summary as string,
          displayName: item.name as string,
          fullHandle: `@${(item as Actor).preferredUsername}@${(new URL(actor!.id!.href).host)})`
        })
      } catch {
        continue;
      }
    }
  }
  catch { }
  finally {
    return {
      items,
      next: `${request.url.split("?")[0]}?next=${followerPage.nextId}`
    }
  }
}
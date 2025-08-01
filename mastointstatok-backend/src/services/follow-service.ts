import { Link, type Actor, type OrderedCollection, type OrderedCollectionPage } from "@fedify/fedify";
import { createContext } from "../federation.js";
import { type Request } from "express";
import type { User } from "../types.js";

export async function GetOrderedCollectionPage(request: Request, actor: Actor, resourceId : string | null, next?: string) {
    const ctx = createContext(request);
    let collectionPage;

    if (!next) {
        if (!resourceId) return []
        collectionPage = await ((await ctx.lookupObject(resourceId)) as OrderedCollection).getFirst();
        if (collectionPage == null) return [];

    } else {
        collectionPage = await ctx.lookupObject(next) as OrderedCollectionPage;
    }

    const items: User[] = []
    try {
        for await (const item of collectionPage.getItems()) {
            try {
                let resolvedItem;
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
    finally {
        return {
            items,
            next: `${request.url.split("?")[0]}${collectionPage.nextId ? `?next=${collectionPage.nextId}` : ''}`,
            totalItems: collectionPage.totalItems
        }
    }
}
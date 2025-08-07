import { createFederation, exportJwk, generateCryptoKeyPair, importJwk, Follow, Person, Image, Accept, Create, Endpoints, Document, InProcessMessageQueue, Note, PUBLIC_COLLECTION, Undo, type Context, type Recipient, Video, MemoryKvStore } from "@fedify/fedify";
import { MongoKvStore } from "./lib/mongo-key-store.js";
import type { AcceptObject, Attachment, CreateObject, FileType, Follower, FollowObject, NoteObject, PostData, UndoObject } from "./types.js";
import { type Request } from "express";
import { FindUserByUri } from "./database/user-queries.js";
import { AddFollower, AddFollowing, getInternalUsersFollowersByUserId, getInternalUsersFollowingByUserId } from "./database/follow-queries.js";
import { getAcceptRecord, getAttachmentRecord, getCreateRecord, getFollowRecord, getNoteRecord, getUndoRecord, insertAcceptRecord, insertAttachmentRecord, insertCreateRecord, insertFollowRecord, insertNoteRecord, insertUndoRecord } from "./database/object-queries.js";
import { ValidationError } from "./lib/errors.js";
import { getLogger } from "@logtape/logtape";
import { getHandleFromUri } from "./services/follow-service.js";
import { Post } from "./database/post-queries.js";

export const federation = createFederation({
  kv: new MemoryKvStore(),
  queue: new InProcessMessageQueue(),
});

const kv = new MongoKvStore();

federation.setActorDispatcher("/api/users/{identifier}", async (ctx, identifier) => {
  const user = await FindUserByUri((ctx.getActorUri(identifier)).href);
  if (!user) return null;

  const userIcon = user.avatarURL
    ? new Image({
        mediaType: "image/jpeg",
        url: new URL(user.avatarURL),
      })
    : undefined;

  return new Person({
    id: new URL(user.actorId),
    preferredUsername: user.username,
    name: user.displayName,
    inbox: ctx.getInboxUri(identifier),
    outbox: ctx.getOutboxUri(identifier),
    followers: ctx.getFollowersUri(identifier),
    endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
    summary: user.bio,
    following: ctx.getFollowingUri(identifier),
    publicKeys: (await ctx.getActorKeyPairs(identifier))
      .map(keyPair => keyPair.cryptographicKey),
    icon: userIcon,
  });
}).setKeyPairsDispatcher(async (ctx, identifier) => {
  const entry = await kv.get<{
    rsaKeyPair: {
      privateKey: JsonWebKey
      publicKey: JsonWebKey
    },
    edKeyPair: {
      privateKey: JsonWebKey
      publicKey: JsonWebKey
    }
  }>(["key", identifier]);
  if (entry == null) {
    const { privateKey: rsaPrivKey, publicKey: rsaPubKey } =
      await generateCryptoKeyPair("RSASSA-PKCS1-v1_5");

    const { privateKey: edPrivKey, publicKey: edPubKey } =
      await generateCryptoKeyPair("Ed25519");

    await kv.set(
      ["key", identifier],
      {
        rsaKeyPair: {
          privateKey: await exportJwk(rsaPrivKey),
          publicKey: await exportJwk(rsaPubKey),
        }, edKeyPair: {
          privateKey: await exportJwk(edPrivKey),
          publicKey: await exportJwk(edPubKey),
        }
      }
    );
    return [{ privateKey: rsaPrivKey, publicKey: rsaPubKey }, { privateKey: edPrivKey, publicKey: edPubKey }];
  }
  const rsaPrivateKey = await importJwk(entry.rsaKeyPair.privateKey, "private");
  const rsaPublicKey = await importJwk(entry.rsaKeyPair.publicKey, "public");
  const edPrivateKey = await importJwk(entry.edKeyPair.privateKey, "private");
  const edPublicKey = await importJwk(entry.edKeyPair.publicKey, "public");

  return [{ privateKey: rsaPrivateKey, publicKey: rsaPublicKey }, { privateKey: edPrivateKey, publicKey: edPublicKey }];
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
        id: new URL(actor.followerId),
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
        id: new URL(`${ctx.canonicalOrigin}/${follow.objectId}/accepts/${resourceGUID}`),
        actor: follow.objectId,
        object: follow,
        to: follow.actorId
      }),
    );
    insertAcceptRecord({
      id: new URL(`${ctx.canonicalOrigin}/${follow.objectId}/accepts/${resourceGUID}`),
      actor: follow.objectId,
      object: follow,
      to: follow.actorId
    })
    if (!follower?.inboxId) return;
    AddFollower(follow.objectId.href, follow.actorId.href, follower?.inboxId.href)
    AddFollowing(follower?.inboxId.href, follow.objectId.href, follow.actorId.href);
  }).on(Accept, async (ctx, accept)=>{
    if(!accept || !accept.id || !accept.objectId || !accept.actorId) return;
    insertAcceptRecord({
      id: accept.id,
      actor: accept.objectId,
      object: await accept.getObject() as Follow,
      to : accept.actorId
    });
  }).on(Undo, async (ctx, undo)=>{
    // Todo the undo following here
    console.log("Received an undo message from an upstream", undo);
  }).on(Create, async (ctx, create)=>{
    console.log("received a create");
    console.log(JSON.stringify(create));
    const object = await create.getObject() 
    console.log(object);
    if(!(object instanceof Note)) {
      getLogger().error("Unsupported document type.");
      return;
    }
    const attachments = object?.getAttachments();

    if(!attachments) {
      getLogger().error("Posts without any attachments are not supported.");
      return;
    }

    if(!create.actorId){
      getLogger().error("Post without authors are not supported.");
      return;
    }
      
    for await (const attachment of attachments){
      if(!(attachment instanceof Image) && !(attachment instanceof Video) && !(attachment instanceof Document)){
        getLogger().error("Unsupported attachment type.")
        return;
      }

      const attachmentUrl = attachment?.url
      let content = (object.contents && object.contents.length > 0) ?  object.contents[0] : object.content ? object.content : null;
      content = content?.toString().replace(/<[^>]+>/g, '') ?? "";
      if(!content){
        getLogger().error("No content provided");
        return;
      }

      if(!attachmentUrl){
        getLogger().error("No url for attachment provided.");
        return;
      }

      let url = attachmentUrl.href;
      if(url instanceof URL){
        url = url.href;
      }

      if(!url){
        getLogger().error("No url for an attachment provided");
        return;
      } 

      const validFileTypes : string[]= [".png", ".jpeg", ".webp", ".jpg",".m4v",".mp4"];
      let fileType : FileType | null = null;
      for (const ext of validFileTypes){
        if(url?.includes(ext)){
        fileType = ext.slice(1) as FileType;
        console.log("This is the file type")
       }
      }
      // const fileType : FileType | null = url?.includes(".png") ? "png" : url.includes(".jpeg") ? "jpeg" : url.includes(".mp4") ? "mp4" : null

      if(!fileType){
        getLogger().error("Unsupported file type received.");
        return;
      }
    
      const post : PostData = {
        id : attachment.id?.href ?? "",
        caption: content.toString(),
        fileType : fileType,
        mediaType : (fileType == "mp4" || fileType == "m4v") ? "video" : "image",
        likedBy: [],
        mediaURL : url,
        timestamp : Date.now(),
        userHandle: getHandleFromUri(create.actorId.href)
      }
      getLogger().debug("Post data successfully created from remote post. Post: {post}", {post: JSON.stringify(post)});
      await Post(post);
    }
  })

federation.setObjectDispatcher(
  Accept,
  "/api/users/{userId}/accept/{acceptId}",
  async (ctx, { userId, acceptId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/accept/${acceptId}`);
    const acceptObject: AcceptObject | null = await getAcceptRecord(id);
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
  "/api/users/{userId}/follows/{followId}",
  async (ctx, { userId, followId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/follows/${followId}`);
    const followObject: FollowObject | null = await getFollowRecord(id);
    if (!followObject || !followObject?.id || !followObject?.actor || !followObject?.object) return null;
    return new Follow({
      id: new URL(followObject?.id),
      actor: new URL(followObject?.actor),
      object: new URL(followObject?.object)
    });
  }
)

federation.setObjectDispatcher(Undo,
  "/api/users/{userId}/undos/{undoId}",
  async (ctx, { userId, undoId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/undos/${undoId}`);
    const undoObject: UndoObject | null = await getUndoRecord(id);
    if (!undoObject || !undoObject?.id || !undoObject?.actor || !undoObject?.object) return null;
    return new Undo({
      id: new URL(undoObject.id),
      actor: new URL(undoObject.actor),
      object: new URL(undoObject.object)
    });
  }
)

export function createContext(request: Request) {
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
  if (!recipient || !recipient.id) return false;

  const sender = ctx.parseUri(new URL(senderId));
  if (sender?.type !== "actor") {
    return false;
  }
  await ctx.sendActivity(
    { identifier: sender.identifier },
    recipient,
    new Follow({
      id: new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/follows/${resourceGUID}`),
      actor: ctx.getActorUri(sender.identifier),
      object: recipient.id,
    }),
  );

  insertFollowRecord({
    id: `${ctx.canonicalOrigin}/users/${sender.identifier}/follows/${resourceGUID}`,
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
  if (!followObject || !followObject.id) throw new ValidationError();
  if (!recipient.id) throw new ValidationError;
  const sender = ctx.parseUri(new URL(senderId));
  const resourceGUID = crypto.randomUUID().split("-")[0]

  if (sender?.type !== "actor") {
    return false;
  }
  await ctx.sendActivity(
    { identifier: sender.identifier },
    recipient,
    new Undo({
      id: new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/undos/${resourceGUID}`),
      actor: ctx.getActorUri(sender.identifier),
      object: new URL(followObject.id),
    }),
  );

  insertUndoRecord({
    id: `${ctx.canonicalOrigin}/users/${sender.identifier}/undos/${resourceGUID}`,
    actor: ctx.getActorUri(sender.identifier).href,
    object: recipient.id.href,
  })
  return true;
}

federation.setObjectDispatcher(Create,
  "/api/users/{userId}/creates/{createId}",
  async (ctx, { userId, createId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/creates/${createId}`);
    const createObject: CreateObject | null = await getCreateRecord(id);
    if (!createObject || !createObject?.id || !createObject?.actor || !createObject?.object) return null;
    return new Create({
      id: new URL(createObject.id),
      actor: new URL(createObject.actor),
      object: createObject.object
    });
  }
)

federation.setObjectDispatcher(Note,
  "/api/users/{userId}/notes/{noteId}",
  async (ctx, { userId, noteId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/notes/${noteId}`);
    const noteObject: NoteObject | null = await getNoteRecord(id);
    if (!noteObject) return null;
    return new Note({
      id: new URL(noteObject.id),
      attribution: ctx.getActorUri(noteObject.senderId),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(noteObject.senderId),
      content: noteObject.content,
      attachments : [new URL(noteObject.attachmentUrl)]
    })
  }
)

federation.setObjectDispatcher(Image,
  "/api/users/{userId}/images/{imageId}",
  async (ctx, { userId, imageId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/images/${imageId}`);
    const attachment: Attachment | null = await getAttachmentRecord(id);
    if (!attachment) return null;
    return new Image({
      id: attachment.id,
      url: attachment.url
    })
  }
)

federation.setObjectDispatcher(Video,
  "/api/users/{userId}/videos/{videoId}",
  async (ctx, { userId, videoId }) => {
    const id = new URL(`${ctx.canonicalOrigin}/users/${userId}/videos/${videoId}`);
    const attachment: Attachment | null = await getAttachmentRecord(id);
    if (!attachment) return null;
    return new Video({
      id: attachment.id,
      url: attachment.url
    })
  }
)

export async function sendNoteToExternalFollowers(
  ctx: Context<unknown>,
  senderId: string,
  recipients: Recipient[],
  caption: string,
  attachmentUrl: string,
  attachmentType: "video" | "image"
) {
  const createResourceGUID = crypto.randomUUID().split("-")[0]
  const noteResourceGUID = crypto.randomUUID().split("-")[0]
  const attachmentResourceGUID = crypto.randomUUID().split("-")[0]
  const sender = ctx.parseUri(new URL(senderId));
  if (sender?.type !== "actor") {
    throw new ValidationError();
  }

  const noteId = new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/notes/${noteResourceGUID}`);
  const imageId = new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/images/${attachmentResourceGUID}`)
  const videoId = new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/videos/${attachmentResourceGUID}`)
  const createId = new URL(`${ctx.canonicalOrigin}/users/${sender.identifier}/creates/${createResourceGUID}`)

  const attachments = attachmentType == "image" ? [new Image({
    id: imageId,
    url: new URL(attachmentUrl),
  })] : [new Video({
    id: videoId,
    url: new URL(attachmentUrl),
  })]

  const note: Note = new Note({
    id: noteId,
    attribution: ctx.getActorUri(senderId),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(senderId),
    content : caption,
    attachments: attachments
  })

  const create = new Create({
    id: createId,
    actor: ctx.getActorUri(sender.identifier),
    object: note,
  })

  // write all the objects to the db for retrieval later
  insertAttachmentRecord({
    id: attachments[0].id as URL,
    url: attachments[0].url as URL
  })

  insertNoteRecord({
    attachmentUrl: note.attachmentIds[0].href,
    content: caption,
    id: noteId.href,
    senderId: senderId
  });

  insertCreateRecord({
    actor: (create.actorId as URL).href,
    id: (create.id as URL).href,
    object: note
  })
  console.log("sending activity");
  console.log(create)
  await ctx.sendActivity(
    { identifier: sender.identifier },
    recipients,
    create
  );
}

export default federation;
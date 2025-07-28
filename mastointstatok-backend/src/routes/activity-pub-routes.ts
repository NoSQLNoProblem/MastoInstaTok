import ActivitypubExpress from 'activitypub-express';
import express from 'express';
export const ActivityPubRouter = express.Router();

const routes = {
  actor: '/u/:actor',
  object: '/o/:id',
  activity: '/s/:id',
  inbox: '/u/:actor/inbox',
  outbox: '/u/:actor/outbox',
  followers: '/u/:actor/followers',
  following: '/u/:actor/following',
  liked: '/u/:actor/liked',
  collections: '/u/:actor/c/:id',
  blocked: '/u/:actor/blocked',
  rejections: '/u/:actor/rejections',
  rejected: '/u/:actor/rejected',
  shares: '/s/:id/shares',
  likes: '/s/:id/likes'
}

export const apex = ActivitypubExpress({
  name: 'Apex Example',
  version: '1.0.0',
  domain: 'localhost:3000',
  actorParam: 'actor',
  objectParam: 'id',
  activityParam: 'id',
  routes
})

ActivityPubRouter.route(routes.inbox)
  .get(apex.net.inbox.get)
  .post(apex.net.inbox.post)
ActivityPubRouter.route(routes.outbox)
  .get(apex.net.outbox.get)
  .post(apex.net.outbox.post)
ActivityPubRouter.get(routes.actor, apex.net.actor.get)
ActivityPubRouter.get(routes.followers, apex.net.followers.get)
ActivityPubRouter.get(routes.following, apex.net.following.get)
ActivityPubRouter.get(routes.liked, apex.net.liked.get)
ActivityPubRouter.get(routes.object, apex.net.object.get)
ActivityPubRouter.get(routes.activity, apex.net.activityStream.get)
ActivityPubRouter.get(routes.shares, apex.net.shares.get)
ActivityPubRouter.get(routes.likes, apex.net.likes.get)
ActivityPubRouter.get('/.well-known/webfinger', apex.net.webfinger.get)
ActivityPubRouter.get('/.well-known/nodeinfo', apex.net.nodeInfoLocation.get)
ActivityPubRouter.get('/nodeinfo/:version', apex.net.nodeInfo.get)
ActivityPubRouter.post('/proxy', apex.net.proxy.post)

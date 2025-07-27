import { Activity } from '../types/Activity';
import { ActivityType } from '../types/ActivityType';
import { NotFoundError } from '../utils/errors';
import * as UserRepository from '../repositories/UserRepository';
import * as PostRepository from '../repositories/PostRepository';
import * as ActivityRepository from '../repositories/ActivityRepository';
import * as InboxRepository from '../repositories/InboxRepository';

export const handleInboxActivity = async (username: string, activity: Activity) => {
  const user = await UserRepository.findByUsername(username);
  if (!user) throw new NotFoundError('User not found');

  switch (activity.type) {
    case ActivityType.Create:
      const post = await PostRepository.saveIfNotExists(activity.object);
      await InboxRepository.addPostToInbox(user.id, post.id);
      break;

    case ActivityType.Like:
      const likedPostId = await PostRepository.findIdByUrl(activity.object);
      if (likedPostId) {
        await PostRepository.addLikeToPost(likedPostId, {
          actor: activity.actor,
          timestamp: new Date().toISOString(),
        });
      }
      break;

    case ActivityType.Follow:
      await UserRepository.addFollower(user.id, {
        actor: activity.actor,
        timestamp: new Date().toISOString(),
      });
      break;

    default:
      throw new NotFoundError(`Unsupported activity type: ${activity.type}`);
  }

  await ActivityRepository.saveActivity(activity);
};

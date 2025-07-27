let posts: any[] = [];

export const saveIfNotExists = async (postObject: any) => {
  let post = posts.find(p => p.id === postObject.id);
  if (!post) {
    const internalId = posts.length + 1;
    post = { ...postObject, internal_id: internalId, likes: [] };
    posts.push(post);
  }
  return post;
};

export const findIdByUrl = async (url: string): Promise<number | undefined> => {
  const post = posts.find(p => p.id === url);
  return post?.internal_id;
};

export const addLikeToPost = async (postId: number, like: { actor: string, timestamp: string }) => {
  const post = posts.find(p => p.internal_id === postId);
  if (post) {
    post.likes = post.likes || [];
    post.likes.push(like);
  }
};

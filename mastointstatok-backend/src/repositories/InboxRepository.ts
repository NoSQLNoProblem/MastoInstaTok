const inboxEntries: any[] = [];

export const addPostToInbox = async (userId: number, postId: number) => {
  inboxEntries.push({
    userId,
    postId,
    timestamp: new Date().toISOString(),
  });
};

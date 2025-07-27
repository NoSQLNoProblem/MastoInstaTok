const users: any[] = [];

export const findByUsername = async (username: string) => {
  return users.find(u => u.username === username);
};

export const addFollower = async (userId: number, follower: { actor: string, timestamp: string }) => {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.followers = user.followers || [];
    user.followers.push(follower);
  }
};

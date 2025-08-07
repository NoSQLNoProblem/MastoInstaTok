export type User = {
    googleId ?: string,
    email ?: string,
    displayName: string,
    actorId: string,
    bio ?: string,
    fullHandle : string,
    avatarURL ?: string,
     isFollowing?: boolean
    isFollowedBy?: boolean
    followers?: number
  };

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  isLoading: boolean;
  registrationRequired: boolean;
  refreshUser: () => void;
}
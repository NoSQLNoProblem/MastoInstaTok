"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import styles from "./profile.module.css";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import { PostData } from "@/types/post";
import { UserProfile } from "@/types/profile";
import { apiService } from "@/services/apiService";

const PAGE_SIZE = 6; // Number of posts to show per page
async function fetchPostsApi(offset: number) {
  // THIS IS FOR TESTING VIA MOCKS
  //==========================================
//   const response = await fetch(
//     `/api/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`,
//     {
//       credentials: "include",
//     }
//   );
//   const data = await response.json();
  //===========================================

  const data = await apiService.get(
    `/me?startIndex=${offset}&pageSize=${PAGE_SIZE}`
  );

  return { items: data.posts, nextOffset: data.nextOffset };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  //will need to use UserPost when fetching real posts
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const {
    items: posts,
    loading: postsLoading,
    error,
    offset,
    fetchNext,
    reset,
  } = usePagination<PostData>(fetchPostsApi);

  // Check authentication and get username
  useEffect(() => {
    if (isLoading) return; // Wait for loading to finish
    if (!isAuthenticated) {
      router.push("/auth");
      return;
    }

    // Generate mock profile data
    const profile: UserProfile = {
      username: user?.displayName || "",
      fullHandle: `@${user?.email}`,
      bio: user?.bio || "",
      posts: 24,
      followers: 1250,
      following: 180,
      avatar: `/placeholder.svg?height=150&width=150&query=user`,
      fullName: user?.displayName || "",
    };
    setProfile(profile);
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        offset !== -1 &&
        !postsLoading // Prevent double fetch
      ) {
        fetchNext();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset, fetchNext, postsLoading]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.error}>
            <p>Profile not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.profileContainer}>
          {/* Profile Header */}
          <header className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                <img
                  src={profile.avatar || "/placeholder.svg"}
                  alt={profile.username}
                  className={styles.avatarImage}
                />
              </div>
            </div>

            <div className={styles.profileInfo}>
              <div className={styles.usernameRow}>
                <h1 className={styles.username}>{profile.username}</h1>
                <button className={styles.editButton}>Edit Profile</button>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{profile.posts}</span>
                  <span className={styles.statLabel}>posts</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>
                    {profile.followers.toLocaleString()}
                  </span>
                  <span className={styles.statLabel}>followers</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{profile.following}</span>
                  <span className={styles.statLabel}>following</span>
                </div>
              </div>

              <div className={styles.bio}>
                <p className={styles.fullHandle}>{profile.fullHandle}</p>
                <p className={styles.bioText}>{profile.bio}</p>
              </div>
            </div>
          </header>

          {/* Posts Grid */}
          <div className={styles.postsSection}>
            <div className={styles.postsHeader}>
              <h2 className={styles.postsTitle}>Posts</h2>
            </div>

            {posts.length === 0 ? (
              <div className={styles.noPosts}>
                <div className={styles.noPostsIcon}>📷</div>
                <h3>No posts yet</h3>
                <p>When you share photos, they'll appear on your profile.</p>
                <button
                  onClick={() => router.push("/create")}
                  className={styles.createFirstPost}
                >
                  Share your first photo
                </button>
              </div>
            ) : (
              <div className={styles.postsGrid}>
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className={styles.postItem}
                    onClick={() => setSelectedPost(post)}
                  >
                    <img
                      src={post.mediaURL || "/placeholder.svg"}
                      alt="Post"
                      className={styles.postImage}
                    />
                    <div className={styles.postOverlay}>
                      <div className={styles.postStats}>
                        <span className={styles.postLikes}>
                          ❤️ {post.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Post Modal */}
      {selectedPost && (
        <div className={styles.modal} onClick={() => setSelectedPost(null)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={() => setSelectedPost(null)}
            >
              ✕
            </button>
            <div className={styles.modalImage}>
              <img
                src={selectedPost?.mediaURL || "/placeholder.svg"}
                alt="Post"
              />
            </div>
            <div className={styles.modalInfo}>
              <div className={styles.modalHeader}>
                <div className={styles.modalUser}>
                  <img
                    src={profile.avatar || "/placeholder.svg"}
                    alt={profile.username}
                    className={styles.modalAvatar}
                  />
                  <span className={styles.modalUsername}>
                    {profile.username}
                  </span>
                </div>
                <span className={styles.modalDate}>
                  {formatDate(selectedPost.timestamp)}
                </span>
              </div>
              <div className={styles.modalCaption}>
                <p>{selectedPost.caption}</p>
              </div>
              <div className={styles.modalStats}>
                <span>❤️ {selectedPost.likes} likes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import styles from "./profile.module.css";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import { PostData } from "@/types/post";
import { apiService } from "@/services/apiService";
import CommentModal from "@/components/CommentModal";

const PAGE_SIZE = 6;
async function fetchMyPostsApi(offset: number) {
// THIS IS FOR TESTING VIA MOCKS
  //==========================================
  // const response = await fetch(
  //   `/api/feed?startIndex=${offset}&pageSize=${PAGE_SIZE}`,
  //   {
  //     credentials: "include",
  //   }
  // );
  // const data = await response.json();
  //===========================================
  const data = await apiService.get(
    `/platform/users/me/posts`
  );
  console.log(data);
  
  return { items: data.posts, nextOffset: data.nextCursor };
}

export default function ProfilePage() {
  const [followersCount, setFollowersCount] = useState<string>("--");
  const [followingCount, setFollowingCount] = useState<string>("--");
  const [postCount, setPostCount] = useState<string>("--");
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  const {
    items: posts,
    loading: postsLoading,
    error,
    offset,
    fetchNext,
  } = usePagination<PostData>(fetchMyPostsApi);

  useEffect(() => {
    const fetchProfileStats = async () => {
      if (isAuthenticated && user?.fullHandle) {
        try {
          const [followersRes, followingRes, postsRes] = await Promise.all([
            apiService.get(`/platform/users/${user.fullHandle}/followers`),
            apiService.get(`/platform/users/${user.fullHandle}/following`),
            apiService.get(`/platform/users/me/posts/count`)
          ]);
          setFollowersCount(followersRes.totalItems?.toString() || "0");
          setFollowingCount(followingRes.totalItems?.toString() || "0");
          setPostCount(postsRes.count?.toString() || "0");
        } catch (err) {
          console.error("Failed to fetch profile stats:", err);
          setFollowersCount("0");
          setFollowingCount("0");
          setPostCount("0");
        }
      }
    };
    fetchProfileStats();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
        fetchNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        offset !== -1 &&
        !postsLoading
      ) {
        fetchNext();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [offset, fetchNext, postsLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);


  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading || !isAuthenticated) {
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
                  src={user?.avatarURL || "/placeholder.svg"}
                  alt={user?.displayName || "User"}
                  className={styles.avatarImage}
                />
              </div>
            </div>
            <div className={styles.profileInfo}>
              <div className={styles.usernameRow}>
                <h1 className={styles.username}>{user?.displayName}</h1>
                <button className={styles.editButton}>Edit Profile</button>
              </div>

              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{postCount}</span>
                  <span className={styles.statLabel}>posts</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{followersCount}</span>
                  <span className={styles.statLabel}>followers</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statNumber}>{followingCount}</span>
                  <span className={styles.statLabel}>following</span>
                </div>
              </div>

              <div className={styles.bio}>
                <p className={styles.fullHandle}>{user?.fullHandle}</p>
                <p className={styles.bioText}>{user?.bio}</p>
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
                    {post.mediaType === "video" ? (
                       <video className={styles.postImage}>
                           <source src={post.mediaURL + "#t=1"} type="video/mp4" />
                       </video>
                    ) : (
                      <img
                        src={post.mediaURL || "/placeholder.svg"}
                        alt="Post"
                        className={styles.postImage}
                      />
                    )}
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
              {selectedPost?.mediaType === "video" ? (
                <video controls autoPlay={false}>
                    <source src={selectedPost?.mediaURL} type="video/mp4" />
                </video>
              ) : (
                <img
                  src={selectedPost?.mediaURL || "/placeholder.svg"}
                  alt="Post"
                />
              )}
            </div>
            <div className={styles.modalInfo}>
              <div className={styles.modalHeader}>
                <div className={styles.modalUser}>
                  <img
                    src={user?.avatarURL || "/placeholder.svg"}
                    alt={user?.displayName || ""}
                    className={styles.modalAvatar}
                  />
                  <span className={styles.modalUsername}>
                    {user?.displayName}
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
                <span onClick={() => setIsCommentModalOpen(true)}>💬</span>
              </div>
            </div>
          </div>
          {isCommentModalOpen && (
                <CommentModal 
                  postId={selectedPost.id} 
                  onClose={() => setIsCommentModalOpen(false)} 
                />
              )}
        </div>

      )}
    </div>
  );
}
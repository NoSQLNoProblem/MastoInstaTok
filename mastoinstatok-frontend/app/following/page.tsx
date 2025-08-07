"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import UserCard from "@/components/UserCard";
import styles from "./following.module.css";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { apiService } from "@/services/apiService";
import { User } from "@/types/auth-context";

interface FollowingResponse {
  items: User[];
  nextPage: string | null;
  totalItems: number;
}
export default function FollowingPage() {
  const [following, setFollowing] = useState<User[]>([]);
  const [latestFollowResponse, setLatestFollowResponse] = useState<FollowingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  async function fetchFollowing() {
    if(latestFollowResponse && latestFollowResponse.items.length <= 0) {
      return; // No more items to fetch
    }
    setLoading(true);
    try {
      if (latestFollowResponse?.nextPage) {
        const response = await apiService.get(latestFollowResponse.nextPage);
        setFollowing((prev) => [...prev, ...response.items]);
        setLatestFollowResponse({
          ...latestFollowResponse,
          nextPage: response.nextPage,
        });
      } else {
        const response = await apiService.get(`/platform/users/${user?.fullHandle}/following`);
        setFollowing(response.items);
        setLatestFollowResponse({
          items: response.items,
          nextPage: response.nextPage,
          totalItems: response.totalItems,
        });
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !user) {
      router.push("/auth");
    }

    fetchFollowing();
  }, []);

    useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000
      ) {
        fetchFollowing();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [latestFollowResponse, fetchFollowing]);

  const handleFollow = (userId: string) => {
    // setFollowing((prev) =>
    //   prev.map((user) =>
    //     user.id === userId
    //       ? {
    //           ...user,
    //           isFollowing: !user.isFollowing,
    //           followers: user.isFollowing
    //             ? user.followers - 1
    //             : user.followers + 1,
    //         }
    //       : user
    //   )
    // );
  };

  const filteredFollowing = following.filter((user) => {
    const matchesSearch =
      user?.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading following...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.followingContainer}>
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>
            <h1 className={styles.title}>Following</h1>
            <div className={styles.count}>{following.length} following</div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search following..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchIcon}>🔍</div>
            </div>
          </div>

          <div className={styles.followingList}>
            {filteredFollowing.length === 0 ? (
              <div className={styles.noResults}>
                {searchQuery ? (
                  <p>No users found matching "{searchQuery}"</p>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👥</div>
                    <h3>Not following anyone yet</h3>
                    <p>When you follow people, they'll appear here.</p>
                    <button
                      onClick={() => router.push("/search")}
                      className={styles.findPeopleButton}
                    >
                      Find people to follow
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.userList}>
                {filteredFollowing.map((user) => {
                  return (
                    <UserCard
                      key={user.actorId}
                      user={{
                        actorId: user.actorId,
                        fullHandle: user.fullHandle || "",
                        displayName: user.displayName,
                        bio: user.bio || "",
                        avatarURL: user.avatarURL,
                        isFollowing: true,
                      }}
                      onFollow={() => handleFollow(user.actorId)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

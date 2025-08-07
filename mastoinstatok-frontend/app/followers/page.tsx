"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import UserCard from "@/components/UserCard";
import styles from "./followers.module.css";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { User } from "@/types/auth-context";
import { apiService } from "@/services/apiService";

interface FollowerResponse {
  items: User[];
  nextPage: string | null;
  totalItems: number;
}

export default function FollowersPage() {
  const [followers, setFollowers] = useState<User[]>([]);
  const [latestFollowerResponse, setLatestFollowerResponse] =
    useState<FollowerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  async function fetchFollowers() {
    if (latestFollowerResponse && latestFollowerResponse.items.length <= 0) {
      return; // No more items to fetch
    }
    setLoading(true);
    try {
      if (latestFollowerResponse?.nextPage) {
        const response = await apiService.get(latestFollowerResponse.nextPage);
        await Promise.all(response.items.map(async (item: User) => {
          item.isFollowedBy = true; // Ensure all fetched users are marked as following
          const followStatus = await apiService.get(`/platform/users/me/follows/${item.fullHandle}`);
          item.isFollowing = followStatus?.userFollowing?.follows;
        }));
        setFollowers((prev) => [...prev, ...response.items]);
        setLatestFollowerResponse({
          ...latestFollowerResponse,
          nextPage: response.nextPage,
        });
      } else {
        const response = await apiService.get(
          `/platform/users/${user?.fullHandle}/followers`
        );
        await Promise.all(response.items.map(async (item: User) => {
          item.isFollowedBy = true; // Ensure all fetched users are marked as following
          const followStatus = await apiService.get(`/platform/users/me/follows/${item.fullHandle}`);
          item.isFollowing = followStatus?.userFollowing?.follows;
        }));
        setFollowers(response.items);
        setLatestFollowerResponse({
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
    if (!authLoading && !isAuthenticated && !user && !loading) {
      router.push("/auth");
    }

    if(!authLoading && isAuthenticated && user) {
      fetchFollowers();
    }
  }, [authLoading, isAuthenticated, user]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 1000
      ) {
        fetchFollowers();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [latestFollowerResponse, fetchFollowers]);

  const handleUnfollow = async (fullHandle: string) => {
    if (!user) return;
    try {
      await apiService.delete(`/platform/users/me/follows/${fullHandle}`);
      setFollowers((prev) =>
        prev.map((u) =>
          u.fullHandle === fullHandle ? { ...u, isFollowing: false } : u
        )
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleFollow = async (fullHandle: string) => {
    if (!user) return;
    try {
      await apiService.post(`/platform/users/me/follows/${fullHandle}`);
      setFollowers((prev) =>
        prev.map((u) =>
          u.fullHandle === fullHandle ? { ...u, isFollowing: true } : u
        )
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredFollowers = followers.filter((user) => {
    const matchesSearch = user?.displayName
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className={styles.container}>
        <Navigation />
        <main className={styles.main}>
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Loading followers...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Navigation />

      <main className={styles.main}>
        <div className={styles.followersContainer}>
          <div className={styles.header}>
            <button onClick={() => router.back()} className={styles.backButton}>
              ← Back
            </button>
            <h1 className={styles.title}>Followers</h1>
            <div className={styles.count}>{followers.length} followers</div>
          </div>

          <div className={styles.searchSection}>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search followers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              <div className={styles.searchIcon}>🔍</div>
            </div>
          </div>

          <div className={styles.followersList}>
            {filteredFollowers.length === 0 ? (
              <div className={styles.noResults}>
                {searchQuery ? (
                  <p>No followers found matching "{searchQuery}"</p>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>👥</div>
                    <h3>No followers yet</h3>
                    <p>When people follow you, they'll appear here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.userList}>
                {filteredFollowers.map((user) => {
                  return(
                    <UserCard
                      key={user.actorId}
                      user={{
                        actorId: user.actorId,
                        fullHandle: user.fullHandle || "",
                        displayName: user.displayName,
                        bio: user.bio || "",
                        avatarURL: user.avatarURL,
                        isFollowedBy: user.isFollowedBy,
                        isFollowing: user.isFollowing,
                      }}
                      onUnfollow={() => handleUnfollow(user.fullHandle)}
                      onFollow={() => handleFollow(user.fullHandle)}
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

"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./auth.module.css"
import { useAuth } from "@/contexts/AuthContext"

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the user is already authenticated, redirect them to the feed
    if (!isLoading && isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.logo}>
          <h1>🦕🫵‼️</h1>
        </div>
        <div className={styles.divider}>
          <span>Login or Register with Google</span>
        </div>
        <button onClick={handleGoogleAuth} className={styles.googleButton}>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}
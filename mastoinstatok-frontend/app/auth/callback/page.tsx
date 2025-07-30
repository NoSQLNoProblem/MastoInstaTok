"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from '../auth.module.css'; // Reusing styles for the loading screen

export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {

    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/feed');
      } else {
        router.push('/auth?error=LoginFailed');
      }
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.logo}>
          <h1>SocialApp</h1>
        </div>
        <div className={styles.loading}>
          <p>Finalizing login, please wait...</p>
        </div>
      </div>
    </div>
  );
}

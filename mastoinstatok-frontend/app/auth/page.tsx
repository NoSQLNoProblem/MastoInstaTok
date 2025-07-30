"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./auth.module.css"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  const handleGoogleAuth = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.logo}>
          <h1>SocialApp</h1>
        </div>

        <div className={styles.divider}>
          <span>{isLogin ? "Log in" : "Sign up"} to continue</span>
        </div>

        <button onClick={handleGoogleAuth} className={styles.googleButton}>
          <span>Continue with Google</span>
        </button>

        <div className={styles.switchMode}>
          <span>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className={styles.switchButton}>
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
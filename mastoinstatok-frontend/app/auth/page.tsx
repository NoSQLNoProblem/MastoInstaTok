"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./auth.module.css"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Simulate authentication
    document.cookie = "auth-token=authenticated; path=/"
    document.cookie = `username=${formData.username || "user"}; path=/`

    router.push("/feed")
  }

  const handleGoogleAuth = () => {
    // Simulate Google OAuth
    document.cookie = "auth-token=authenticated; path=/"
    document.cookie = "username=googleuser; path=/"
    router.push("/feed")
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.logo}>
          <h1>SocialApp</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && (
            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={styles.input}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={styles.input}
            required
          />

          <button type="submit" className={styles.submitButton}>
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>OR</span>
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
  )
}

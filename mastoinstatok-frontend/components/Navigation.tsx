"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import styles from "./Navigation.module.css"

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
    router.push("/auth")
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/feed" className={styles.logo}>
          SocialApp
        </Link>

        <div className={styles.navLinks}>
          <Link href="/feed" className={`${styles.navLink} ${pathname === "/feed" ? styles.active : ""}`}>
            🏠 Feed
          </Link>
          <Link href="/search" className={`${styles.navLink} ${pathname === "/search" ? styles.active : ""}`}>
            🔍 Search
          </Link>
          <Link href="/create" className={`${styles.navLink} ${pathname === "/create" ? styles.active : ""}`}>
            ➕ Create
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            🚪 Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

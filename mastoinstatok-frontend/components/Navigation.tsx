"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import styles from "./Navigation.module.css"
import { House, LogOut, PersonStanding, Plus, Search } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()
  const { logout, isAuthenticated } = useAuth() 
  const scrolliosisLogo = '/scrolliosis-logo-horizontal.png'

  const handleLogout = () => {
    logout();
  }

  if (!isAuthenticated) {
    // Render nothing or a minimal version if the user is not logged in
    return null; 
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/feed" className={styles.logo}>
          <img className={styles.applogo} src={scrolliosisLogo}/>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/feed" className={`${styles.navLink} ${pathname === "/feed" ? styles.active : ""}`}>
            <House/> 
            Feed
          </Link>
          <Link href="/search" className={`${styles.navLink} ${pathname === "/search" ? styles.active : ""}`}>
            <Search/>
            Search
          </Link>
          <Link href="/create" className={`${styles.navLink} ${pathname === "/create" ? styles.active : ""}`}>
            <Plus/>
            Create
          </Link>
          <Link href="/profile" className={`${styles.navLink} ${pathname === "/profile" ? styles.active : ""}`}>
            <PersonStanding/>
            Profile
          </Link>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut/>
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

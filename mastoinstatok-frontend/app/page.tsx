import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function HomePage() {
  const cookieStore = await cookies()
  const isAuthenticated = cookieStore.get("auth-token")

  if (isAuthenticated) {
    redirect("/feed")
  } else {
    redirect("/registration")
  }
}

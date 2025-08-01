"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./registration.module.css";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/apiService";

export default function RegistrationPage() {
  const [displayName, setDisplayName] = useState<string>("");
  const [biography, setBiography] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const router = useRouter();
  const { refreshUser, logout } = useAuth();

  const displayNameRegex = /^(?=.{1,30}$)[a-zA-Z](?:[a-zA-Z0-9_]*[a-zA-Z0-9])?$/;

  const validateDisplayNameAndBiography = (name: string, biography: string) => {
    if (!displayNameRegex.test(name)) {
      setError("Please enter a valid display name.");
      return false;
    }
    else if (biography.length > 255) {
      setError("The biography is too long. Please shorten it to 255 characters or less.");
      return false;
    }
    setError("");
    return true;
  };

  useEffect(() => {
    validateDisplayNameAndBiography(displayName, biography);
  }, [displayName, biography]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateDisplayNameAndBiography(displayName, biography)) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await apiService.post("/platform/users/me", {
        displayName: displayName,
        bio: biography,
      });
      await refreshUser();
      router.push("/feed");

    } catch (error) {
      console.error("Error setting display name:", error);
      if (error instanceof Error && error.message.includes("409")) {
        setError("This username is already taken.");
      } else {
        setError("Failed to connect to the server. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.registrationCard}>
        <button onClick={logout} className={styles.logoutButton} aria-label="Logout">
          Logout🚪
        </button>

        <h1 className={styles.title}>Choose Your Display Name</h1>
        <p className={styles.subheading}>
          This will be your unique handle across the platform.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="displayName" className="font-medium">
              Display name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., social_user"
              className={styles.input}
              required
              aria-describedby="error-message"
            />
            <p className= {styles.textCount}>Character count: {displayName.length}</p>
            <label htmlFor="biography" className="font-medium">
              Biography
            </label>
            <textarea
              id="biography"
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="e.g., Hi, my name is ...!"
              className={styles.input}
              required
              rows={3}
              maxLength={255}
              aria-describedby="error-message"
            />
            <p className= {styles.textCount}>Character count: {biography.length}</p>
            {error && (
              <p id="error-message" className={styles.errorText}>
                {error}
              </p>
            )}
          </div>

          <div className={styles.buttonContainer}>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !!error || !displayName}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>

        <div className={styles.rulesContainer}>
          <h2 className={styles.rulesTitle}>Rules for display names:</h2>
          <ul className={styles.rulesList}>
            <li className={styles.ruleText}>
              Must be between 1 and 30 characters long.
            </li>
            <li className={styles.ruleText}>
              Can only contain letters, numbers, and underscores.
            </li>
            <li className={styles.ruleText}>Must start with a letter.</li>
            <li className={styles.ruleText}>Cannot end with an underscore.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
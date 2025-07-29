"use client";

import type React from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./registration.module.css";

export default function RegistrationPage() {
  const [username, setUsername] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const router = useRouter();

  const usernameRegex = /^(?=.{1,30}$)[a-zA-Z](?:[a-zA-Z0-9_]*[a-zA-Z0-9])?$/;

  const validateUsername = (name: string) => {
    if (!usernameRegex.test(name)) {
      setError("Please enter a valid username.");
      return false;
    }
    setError("");
    return true;
  };

  useEffect(() => {
    if (username) {
      validateUsername(username);
    } else {
      setError("");
    }
  }, [username]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateUsername(username)) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        router.push("/feed");
      } else if (response.status === 409) {
        const data = await response.json();
        setError(data.message || "This username is already taken.");
      } else {
        throw new Error("An unexpected error has occurred.");
      }
    } catch (error) {
      console.error("Error setting username:", error);
      setError("Failed to connect to the server. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.registrationCard}>
        <h1 className={styles.title}>Choose Your Username</h1>
        <p className="text-muted-foreground mb-6">
          This will be your unique handle across the platform.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="username" className="font-medium">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., social_user"
              className={styles.input}
              required
              aria-describedby="error-message"
            />
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
              disabled={isSubmitting || !!error || !username}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </button>
          </div>
        </form>

        <div className={styles.rulesContainer}>
          <h2 className={styles.rulesTitle}>Rules for usernames:</h2>
          <ul>
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

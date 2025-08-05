"use client";

import type React from "react";

import { useState } from "react";
import styles from "./EditProfileModal.module.css";
import { User } from "@/types/auth-context";

interface EditProfileModalProps {
  profile: User;
  onSave: (data: { displayName: string; bio: string }) => void;
  onClose: () => void;
}

export default function EditProfileModal({
  profile,
  onSave,
  onClose,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<{
    displayName: string;
    bio: string;
  }>({
    displayName: profile.displayName ?? "",
    bio: profile.bio ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    onSave(formData);
    setIsSaving(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Profile</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              <img
                src={profile.avatarURL || "/placeholder.svg"}
                alt={profile.displayName}
                className={styles.avatarImage}
              />
            </div>
            <div className={styles.avatarInfo}>
              <h3 className={styles.username}>{profile.displayName}</h3>
              <button type="button" className={styles.changePhotoButton}>
                Change profile photo
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="fullName" className={styles.label}>
              Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.displayName}
              onChange={handleInputChange}
              className={styles.input}
              maxLength={50}
              required
            />
            <div className={styles.characterCount}>
              {formData.displayName?.length}/50
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="bio" className={styles.label}>
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className={styles.textarea}
              rows={4}
              maxLength={150}
              placeholder="Tell people a little about yourself..."
            />
            <div className={styles.characterCount}>
              {formData.bio?.length}/150
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

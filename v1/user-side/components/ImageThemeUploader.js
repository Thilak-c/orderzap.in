"use client";

import { useState, useEffect } from "react";
import { mapColorsToTheme, applyTheme } from "@/lib/theme-utils";
import { useThemePersistence } from "@/lib/useThemePersistence";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * ImageThemeUploader Component
 * Allows users to upload an image and automatically applies extracted colors as theme
 * @param {string} restaurantId - Convex ID of the restaurant to save theme for
 */
export default function ImageThemeUploader({ restaurantId }) {
  const [colors, setColors] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(null);
  
  const saveTheme = useMutation(api.restaurants.saveTheme);
  
  // Use theme persistence hook to maintain theme across navigation
  useThemePersistence(currentTheme);

  /**
   * Handle image file upload and color extraction
   * @param {Event} event - File input change event
   */
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create FormData to send file to API
      const formData = new FormData();
      formData.append('image', file);

      // Send to color extraction API
      const response = await fetch('/api/extract-colors', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract colors');
      }

      const data = await response.json();
      setColors(data.colors);
      
      // Save theme to restaurant if restaurantId is provided
      if (restaurantId && data.colors) {
        try {
          await saveTheme({
            restaurantId,
            themeColors: data.colors,
          });
        } catch (saveError) {
          console.error('Failed to save theme:', saveError);
          // Don't show error to user, theme is still applied locally
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to upload image. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply theme when colors change
  useEffect(() => {
    if (colors) {
      const theme = mapColorsToTheme(colors);
      applyTheme(theme);
      setCurrentTheme(theme);
    }
  }, [colors]);

  return (
    <div className="image-theme-uploader">
      <div className="upload-section">
        <label htmlFor="theme-image-upload" className="upload-label">
          Upload Image to Generate Theme
        </label>
        <input
          id="theme-image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={loading}
          className="file-input"
        />
      </div>

      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Extracting colors...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {colors && (
        <div className="color-preview">
          <p className="preview-title">Theme Colors:</p>
          <div className="color-swatches">
            <div className="color-swatch">
              <div 
                className="swatch-box" 
                style={{ backgroundColor: colors.dominant }}
              ></div>
              <span className="swatch-label">Background</span>
            </div>
            <div className="color-swatch">
              <div 
                className="swatch-box" 
                style={{ backgroundColor: colors.darkVibrant }}
              ></div>
              <span className="swatch-label">Primary</span>
            </div>
            <div className="color-swatch">
              <div 
                className="swatch-box" 
                style={{ backgroundColor: colors.lightVibrant }}
              ></div>
              <span className="swatch-label">Secondary</span>
            </div>
            <div className="color-swatch">
              <div 
                className="swatch-box" 
                style={{ backgroundColor: colors.muted }}
              ></div>
              <span className="swatch-label">Accent</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .image-theme-uploader {
          padding: 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          background: white;
          margin: 1rem 0;
        }

        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .upload-label {
          font-weight: 500;
          font-size: 0.875rem;
          color: #374151;
        }

        .file-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
        }

        .file-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #f3f4f6;
          border-radius: 0.375rem;
        }

        .spinner {
          width: 1.25rem;
          height: 1.25rem;
          border: 2px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-indicator p {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .error-message {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
        }

        .error-message p {
          margin: 0;
          font-size: 0.875rem;
          color: #dc2626;
        }

        .color-preview {
          margin-top: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.375rem;
        }

        .preview-title {
          margin: 0 0 0.75rem 0;
          font-weight: 500;
          font-size: 0.875rem;
          color: #374151;
        }

        .color-swatches {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .color-swatch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
        }

        .swatch-box {
          width: 3rem;
          height: 3rem;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .swatch-label {
          font-size: 0.75rem;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}

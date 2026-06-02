/**
 * Google Drive PWA File Manager Configuration
 * 請將 GOOGLE_CLIENT_ID 換成你在 Google Cloud Console 建立的 OAuth 2.0 Client ID。
 */
window.APP_CONFIG = {
  APP_NAME: "Google Drive PWA File Manager",
  APP_VERSION: "1.0.0",
  LATEST_VERSION: "1.0.0",
  GOOGLE_CLIENT_ID: "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/drive",
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024
};

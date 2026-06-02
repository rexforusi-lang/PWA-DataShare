/**
 * Google Drive PWA File Manager Configuration
 * Version: V0.5
 * 使用者資料皆由 Settings 輸入並儲存在 localStorage；本檔不保存任何使用者資料。
 */
window.APP_CONFIG = {
  APP_NAME: "Google Drive PWA File Manager",
  APP_VERSION: "V0.5",
  CACHE_NAME: "drive-pwa-file-manager-v0.5-20260602",
  DEFAULT_VERSION_CHECK_URL: "./version.json",
  SCOPES: "https://www.googleapis.com/auth/drive",
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024
};

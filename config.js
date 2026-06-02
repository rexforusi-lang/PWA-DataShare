/**
 * Google Drive PWA File Manager Configuration
 * Version: 1.0.0
 *
 * 重要：
 * - 本檔不保存任何使用者資料。
 * - OAuth Client ID 與 Google Drive Folder ID 均由 Settings 頁面輸入，並儲存在使用者瀏覽器 localStorage。
 */
window.APP_CONFIG = {
  APP_NAME: "Google Drive PWA File Manager",
  APP_VERSION: "1.0.0",
  LATEST_VERSION: "1.0.0",
  SCOPES: "https://www.googleapis.com/auth/drive",
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024
};

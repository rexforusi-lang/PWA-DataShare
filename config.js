/**
 * Google Drive PWA File Manager Configuration
 * Version: 1.0.1
 *
 * 重要：
 * - 本檔不保存任何使用者資料。
 * - OAuth Client ID 與 Google Drive Folder ID 均由 Settings 頁面輸入，並儲存在使用者瀏覽器 localStorage。
 * - 最新版資訊由 version.json 提供，檢查更新時會動態讀取。
 */
window.APP_CONFIG = {
  APP_NAME: "Google Drive PWA File Manager",
  APP_VERSION: "1.0.1",
  VERSION_CHECK_URL: "./version.json",
  SCOPES: "https://www.googleapis.com/auth/drive",
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024
};

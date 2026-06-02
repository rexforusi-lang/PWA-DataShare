/**
 * Google Drive PWA File Manager Configuration
 * Version: V0.4
 *
 * 重要：
 * - 本檔不保存任何使用者資料。
 * - OAuth Client ID、Google Drive Folder ID、GitHub version.json URL 均由 Settings 頁面輸入，並儲存在使用者瀏覽器 localStorage。
 * - 程式版本 APP_VERSION 與 ZIP 檔版本一致，例如 V0.4。
 */
window.APP_CONFIG = {
  APP_NAME: "Google Drive PWA File Manager",
  APP_VERSION: "V0.4",
  CACHE_NAME: "drive-pwa-file-manager-v0.4-20260602",
  DEFAULT_VERSION_CHECK_URL: "./version.json",
  SCOPES: "https://www.googleapis.com/auth/drive",
  MAX_FILE_SIZE_BYTES: 1024 * 1024 * 1024
};

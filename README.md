# GoogleDrivePWA V0.3

Google Drive PWA File Manager，可部署於 GitHub Pages。

## V0.3 更新重點

- 新增 `version.json` 作為版本檢查來源。
- Settings 的「檢查更新」改為真正讀取 `version.json`。
- 加入 cache busting，避免讀到舊版快取。
- Service Worker 排除 `version.json` 快取。
- 檢查更新結果會顯示目前版本、最新版、發布日期與更新說明。

## 使用方式

1. 部署到 GitHub Pages。
2. 開啟頁面後進入 Settings。
3. 輸入 Google OAuth Client ID。
4. 輸入 Google Drive Folder ID。
5. 點選「儲存設定到本機」。
6. 回到 File Manager，點選「登入 Google」。
7. 在 Settings 點選「檢查更新」讀取 `version.json`。

## 如何發布新版本

1. 更新 `config.js` 的 `APP_VERSION`。
2. 更新 `version.json` 的 `latestVersion`、`releaseDate`、`releaseNote`。
3. 更新 `sw.js` 的 `CACHE_NAME`。
4. 將所有檔案部署到 GitHub Pages。
5. 使用者端建議清除舊 Service Worker 或重新整理頁面。

## 使用者資料儲存位置

以下資料只儲存在使用者本機瀏覽器 localStorage：

- Google OAuth Client ID
- Google Drive Folder ID

`config.js`、`app.js`、`version.json` 不保存任何使用者資料。

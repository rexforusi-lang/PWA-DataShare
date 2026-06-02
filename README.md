# GoogleDrivePWA V0.4

Google Drive PWA File Manager，可部署於 GitHub Pages。

## V0.4 更新重點

- 程式版本 `APP_VERSION` 改為與 ZIP 檔版本一致，例如 `V0.4`。
- Settings 顯示：
  - 目前執行版本
  - 本機 PWA Cache 版本
  - GitHub 最新版本
- Settings 新增 `GitHub version.json URL`，儲存在使用者本機 localStorage。
- 按下「檢查更新並自動套用」後，程式會：
  1. 讀取 GitHub 上的 `version.json`
  2. 比對 `latestVersion` 與目前 `APP_VERSION`
  3. 若 GitHub 版本較新，自動解除 Service Worker 註冊
  4. 自動清除 Cache Storage
  5. 保留 localStorage 中的 OAuth Client ID、Folder ID、GitHub version.json URL
  6. 自動重新載入頁面，以取得 GitHub Pages 上已部署的新檔案

## 重要限制

GitHub Pages 是靜態網站，瀏覽器端無法自行修改 GitHub repository 檔案。
所謂「自動更新」是指：GitHub Pages 已經部署新版後，使用者端自動清除舊 PWA 快取並重新載入新版檔案。

## GitHub version.json URL 範例

GitHub Pages：

```text
https://你的帳號.github.io/你的repo/version.json
```

GitHub Raw：

```text
https://raw.githubusercontent.com/你的帳號/你的repo/main/version.json
```

## 發布新版本時需要同步更新

1. `config.js`

```javascript
APP_VERSION: "V0.5"
```

2. `version.json`

```json
{
  "latestVersion": "V0.5",
  "releaseDate": "2026-06-02",
  "releaseNote": "你的更新說明",
  "forceReload": true
}
```

3. `sw.js`

```javascript
const CACHE_NAME = "drive-pwa-file-manager-v0.5-20260602";
```

4. ZIP 檔名

```text
GoogleDrivePWA-V0.5-YYYYMMDD.zip
```

## 使用者資料儲存位置

以下資料只儲存在使用者本機瀏覽器 localStorage：

- Google OAuth Client ID
- Google Drive Folder ID
- GitHub version.json URL

`config.js`、`app.js`、`version.json` 不保存任何使用者資料。

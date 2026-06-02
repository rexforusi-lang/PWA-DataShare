# Google Drive PWA File Manager

可部署於 GitHub Pages 的 Google Drive 檔案管理 PWA。

## 使用前必做

1. 到 Google Cloud Console 啟用 Google Drive API。
2. 建立 OAuth 2.0 Client ID，類型選 Web application。
3. 在 Authorized JavaScript origins 加入你的 GitHub Pages origin，例如：
   - `https://你的帳號.github.io`
4. 修改 `config.js`：
   - 將 `YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com` 換成你的 Client ID。
5. 到 Google Drive 建立或選擇共享資料夾，將團隊成員設為 Editor。
6. 開啟網頁後，在 Settings 輸入 Folder ID。

## 檔案

- `index.html`
- `app.js`
- `config.js`
- `styles.css`
- `sw.js`
- `manifest.json`

## 注意

此專案是純前端 OAuth 架構，不包含後端。所有 Drive 操作都以目前登入 Google 使用者的權限執行。

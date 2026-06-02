# GoogleDrivePWA V0.2

Google Drive PWA File Manager，可部署於 GitHub Pages。

## V0.2 更新重點

- OAuth Client ID 改由 Settings 頁面輸入。
- Google Drive Folder ID 改由 Settings 頁面輸入。
- 所有設定資料均儲存在使用者本機瀏覽器 localStorage。
- `config.js` 不保存 OAuth Client ID、Folder ID 或任何使用者資料。
- 新增清除本機設定功能。

## 使用方式

1. 部署到 GitHub Pages。
2. 開啟頁面後進入 Settings。
3. 輸入 Google OAuth Client ID。
4. 輸入 Google Drive Folder ID。
5. 點選「儲存設定到本機」。
6. 回到 File Manager，點選「登入 Google」。

## Google Cloud 必要設定

OAuth Client 必須是 Web application 類型。
Authorized JavaScript origins 請加入 GitHub Pages origin，例如：

```text
https://你的GitHub帳號.github.io
```

若本機測試，請加入實際 localhost origin，例如：

```text
http://localhost:5500
http://127.0.0.1:5500
```

## 注意

本專案為純前端 PWA。所有 Drive 操作都以目前登入 Google 使用者的權限執行。
多人共用請透過 Google Drive 資料夾分享設定，將團隊成員設為 Editor。

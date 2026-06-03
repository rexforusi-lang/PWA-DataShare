# GoogleDrivePWA V1.8

- 修正檢查更新後重新載入仍停在舊版的問題。
- `index.html` 內 `styles.css`、`config.js`、`app.js` 已加入版本參數。
- Service Worker 註冊加入版本參數。
- 更新後會跳轉至 `index.html?forceUpdate=版本號&t=timestamp`。
- 新增 `pendingVersion` 更新驗證機制。
- 避免 `forceReload=true` 造成無限重整。

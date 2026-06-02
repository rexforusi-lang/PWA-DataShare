# GoogleDrivePWA V0.5

## V0.5 更新重點

- 程式版本與 ZIP 檔案版本一致：`V0.5`。
- 支援一次選擇多個檔案上傳。
- 多檔上傳採逐一上傳，降低大量檔案或大檔造成的瀏覽器與 API 負載。
- 單一檔案限制維持 1GB；超過限制的檔案會略過，不中斷其他檔案。
- 顯示已選擇檔案數量、總大小與上傳進度。
- 上傳完成後顯示成功、失敗、略過統計。
- 新增「記住登入狀態」，重新整理或重啟頁面後會自動嘗試重新取得 Google access token。
- 不會把 access token 或 refresh token 寫入 localStorage。

## 使用者資料儲存位置

以下資料只儲存在使用者本機瀏覽器 localStorage：

- Google OAuth Client ID
- Google Drive Folder ID
- GitHub version.json URL
- 是否記住登入狀態
- 上次登入 email 與時間

## 重要限制

基於 Google OAuth 安全限制，頁面重啟後仍需重新取得 access token。V0.5 的「記住登入狀態」會在 Google session 有效時自動嘗試靜默取得 token；若 Google session 過期、使用者登出 Google、瀏覽器阻擋登入流程，仍需手動登入。

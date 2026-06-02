# GoogleDrivePWA V0.6

## V0.6 更新重點

- 程式版本與 ZIP 檔案版本一致：`V0.6`。
- 改名與刪除不限制上傳者，改由 Google Drive 權限決定。
- 新增檔案 checkbox、全選 checkbox、批次刪除、取消選取。
- 批次刪除採逐一刪除，單筆失敗不中斷其他檔案。
- 新增批次刪除進度與結果摘要。
- 新增正式 PWA icons：`icons/icon-192.svg`、`icons/icon-512.svg`、`icons/maskable-icon.svg`。
- `manifest.json` 改用正式 icons 路徑。
- 手機版檔案列表改為卡片式 UI，操作按鈕更大、更易閱讀。

## 權限說明

刪除與改名權限由 Google Drive 分享權限決定。只要目前登入者對目標資料夾或檔案有足夠權限，即可操作，不限定檔案上傳者。

## 使用者資料儲存位置

以下資料只儲存在使用者本機瀏覽器 localStorage：OAuth Client ID、Folder ID、GitHub version.json URL、登入記憶狀態。

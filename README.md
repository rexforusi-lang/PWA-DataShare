# GoogleDrivePWA V0.9

## V0.9 更新重點

- 新增「Google 登入模式 / 免登入 Apps Script 上傳模式」。
- 免登入模式下，使用者不需要登入 Google 就能上傳檔案。
- 免登入模式下，Folder ID 不需要存在前端，建議只寫在 `apps-script/Code.gs`。
- 前端只需要設定 Apps Script Web App URL 與 Upload Secret Key。
- 免登入模式僅支援上傳；列表、下載、改名、刪除仍需 Google 登入。

## Apps Script 部署

1. 到 https://script.new/ 建立 Apps Script。
2. 複製 `apps-script/Code.gs` 內容。
3. 修改：
   - `FOLDER_ID`
   - `SECRET_KEY`
   - `MAX_FILE_SIZE_MB`
   - `ALLOWED_EXTENSIONS`
4. Deploy > New deployment > Web app。
5. Execute as: Me。
6. Who has access: Anyone。
7. 複製 Web App URL，填入 PWA Settings。

## 安全提醒

Web App URL 與 Secret Key 外流後，知道的人可上傳檔案。請限制檔案大小、副檔名，並定期更換 Secret Key。

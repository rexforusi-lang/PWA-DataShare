/**
 * Google Drive PWA File Manager
 * Program: GoogleDrivePWA
 * Version: V0.2
 * Date: 2026-06-02
 *
 * Version log:
 * V0.2 - 2026-06-02
 * - Settings 新增 Google OAuth Client ID 輸入欄位。
 * - OAuth Client ID 與 Google Drive Folder ID 均改由使用者於頁面輸入，並儲存在 localStorage。
 * - config.js 不再保存任何使用者資料或 OAuth Client ID。
 * - 新增清除本機設定功能。
 * - OAuth 初始化前會檢查 Client ID，避免 invalid_client 類型錯誤難以排查。
 *
 * V0.1 - 2026-06-02
 * - 初版 Google Drive PWA File Manager。
 * - 支援登入、資料夾 ID、檔案列表、上傳、下載、改名、刪除與 PWA 基本快取。
 */
const CONFIG = window.APP_CONFIG;

const STORAGE_KEYS = {
  FOLDER_ID: "drive_pwa_folder_id",
  GOOGLE_CLIENT_ID: "drive_pwa_google_client_id"
};

let tokenClient = null;
let accessToken = null;
let currentUserEmail = "";
let initializedClientId = "";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");
const clientIdStatus = document.getElementById("clientIdStatus");
const folderStatus = document.getElementById("folderStatus");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileTableBody = document.getElementById("fileTableBody");
const messageBox = document.getElementById("messageBox");
const clientIdInput = document.getElementById("clientIdInput");
const folderIdInput = document.getElementById("folderIdInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const clearSettingsBtn = document.getElementById("clearSettingsBtn");
const currentVersion = document.getElementById("currentVersion");
const checkUpdateBtn = document.getElementById("checkUpdateBtn");
const updateResult = document.getElementById("updateResult");

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  initTabs();
  initSettings();
  registerServiceWorker();

  loginBtn.addEventListener("click", signIn);
  logoutBtn.addEventListener("click", signOut);
  uploadBtn.addEventListener("click", uploadSelectedFile);
  refreshBtn.addEventListener("click", listFiles);
  saveSettingsBtn.addEventListener("click", saveSettings);
  clearSettingsBtn.addEventListener("click", clearLocalSettings);
  checkUpdateBtn.addEventListener("click", checkForUpdates);

  updateClientIdStatus();
  updateFolderStatus();
  waitForGoogleIdentity();
}

function waitForGoogleIdentity(retry = 0) {
  if (window.google && window.google.accounts) {
    initGoogleIdentityIfPossible();
    return;
  }

  if (retry > 30) {
    showMessage("Google Identity Services 載入逾時，請確認網路連線後重新整理。", "error");
    return;
  }

  setTimeout(() => waitForGoogleIdentity(retry + 1), 200);
}

function initGoogleIdentityIfPossible() {
  const clientId = getGoogleClientId();

  if (!clientId) {
    loginBtn.disabled = true;
    showMessage("請先到 Settings 設定 Google OAuth Client ID，儲存後再登入。", "info");
    return;
  }

  if (!isValidClientIdFormat(clientId)) {
    loginBtn.disabled = true;
    showMessage("OAuth Client ID 格式不正確，請到 Settings 修正。", "error");
    return;
  }

  initializedClientId = clientId;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CONFIG.SCOPES,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        showMessage(`登入失敗：${tokenResponse.error}`, "error");
        return;
      }

      accessToken = tokenResponse.access_token;
      await loadUserProfile();

      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      loginStatus.textContent = currentUserEmail ? `已登入：${currentUserEmail}` : "已登入 Google";

      showMessage("登入成功。", "success");
      listFiles();
    },
    error_callback: (error) => {
      if (error.type === "popup_failed_to_open") {
        showMessage("登入視窗無法開啟，請允許瀏覽器彈出視窗。", "error");
      } else if (error.type === "popup_closed") {
        showMessage("登入視窗已關閉，尚未完成授權。", "info");
      } else {
        showMessage(`登入發生錯誤：${JSON.stringify(error)}`, "error");
      }
    }
  });

  loginBtn.disabled = false;
}

function signIn() {
  const clientId = getGoogleClientId();

  if (!clientId) {
    showMessage("請先到 Settings 設定 Google OAuth Client ID。", "error");
    switchToSettingsTab();
    return;
  }

  if (!tokenClient || initializedClientId !== clientId) {
    initGoogleIdentityIfPossible();
  }

  if (!tokenClient) {
    showMessage("Google OAuth 尚未初始化，請確認 Client ID 後重新整理頁面。", "error");
    return;
  }

  tokenClient.requestAccessToken({ prompt: "consent" });
}

function signOut() {
  if (accessToken && window.google) {
    google.accounts.oauth2.revoke(accessToken);
  }

  accessToken = null;
  currentUserEmail = "";

  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  loginStatus.textContent = "尚未登入";
  fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">請先登入</td></tr>`;

  showMessage("已登出。", "success");
}

async function loadUserProfile() {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    currentUserEmail = data.email || "";
  } catch {
    currentUserEmail = "";
  }
}

function getGoogleClientId() {
  return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || "";
}

function getFolderId() {
  return localStorage.getItem(STORAGE_KEYS.FOLDER_ID) || "";
}

function saveSettings() {
  const clientId = clientIdInput.value.trim();
  const folderId = folderIdInput.value.trim();

  if (!clientId) {
    showMessage("請輸入 Google OAuth Client ID。", "error");
    return;
  }

  if (!isValidClientIdFormat(clientId)) {
    showMessage("Google OAuth Client ID 格式不正確，應以 .apps.googleusercontent.com 結尾。", "error");
    return;
  }

  if (!folderId) {
    showMessage("請輸入 Google Drive 資料夾 ID。", "error");
    return;
  }

  const previousClientId = getGoogleClientId();
  localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId);
  localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folderId);

  updateClientIdStatus();
  updateFolderStatus();

  if (previousClientId !== clientId) {
    tokenClient = null;
    accessToken = null;
    initializedClientId = "";
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    loginStatus.textContent = "尚未登入";
    initGoogleIdentityIfPossible();
    showMessage("設定已儲存於本機。OAuth Client ID 已更新，請重新登入 Google。", "success");
    return;
  }

  showMessage("設定已儲存於本機。", "success");
  if (accessToken) listFiles();
}

function clearLocalSettings() {
  const confirmed = confirm("確定要清除本機儲存的 OAuth Client ID 與 Folder ID 嗎？清除後需要重新設定。");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEYS.GOOGLE_CLIENT_ID);
  localStorage.removeItem(STORAGE_KEYS.FOLDER_ID);

  clientIdInput.value = "";
  folderIdInput.value = "";
  tokenClient = null;
  accessToken = null;
  initializedClientId = "";

  loginBtn.disabled = true;
  loginBtn.classList.remove("hidden");
  logoutBtn.classList.add("hidden");
  loginStatus.textContent = "尚未登入";

  updateClientIdStatus();
  updateFolderStatus();
  fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">請先到 Settings 設定 OAuth Client ID 與資料夾 ID。</td></tr>`;

  showMessage("本機設定已清除。", "success");
}

function initSettings() {
  currentVersion.value = CONFIG.APP_VERSION;
  clientIdInput.value = getGoogleClientId();
  folderIdInput.value = getFolderId();
}

function updateClientIdStatus() {
  const clientId = getGoogleClientId();
  clientIdStatus.textContent = clientId ? `OAuth Client ID：${maskClientId(clientId)}` : "尚未設定 OAuth Client ID";
}

function updateFolderStatus() {
  const folderId = getFolderId();
  folderStatus.textContent = folderId ? `目前資料夾 ID：${folderId}` : "尚未設定資料夾 ID";
}

function checkForUpdates() {
  updateResult.textContent = CONFIG.APP_VERSION === CONFIG.LATEST_VERSION
    ? `目前已是最新版本：${CONFIG.APP_VERSION}`
    : `發現新版本：${CONFIG.LATEST_VERSION}，目前版本：${CONFIG.APP_VERSION}`;
}

async function listFiles() {
  if (!ensureReady()) return;

  fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">載入中...</td></tr>`;

  const query = `'${escapeDriveQuery(getFolderId())}' in parents and trashed = false`;
  const params = new URLSearchParams({
    q: query,
    pageSize: "100",
    orderBy: "createdTime desc",
    fields: "files(id,name,mimeType,size,createdTime,modifiedTime,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress),webContentLink)"
  });

  try {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
    const data = await res.json();
    renderFileTable(data.files || []);
  } catch (error) {
    showMessage(`讀取檔案失敗：${error.message}`, "error");
    fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">讀取失敗</td></tr>`;
  }
}

function renderFileTable(files) {
  if (!files.length) {
    fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">此資料夾目前沒有檔案</td></tr>`;
    return;
  }

  fileTableBody.innerHTML = "";

  files.forEach((file) => {
    const tr = document.createElement("tr");
    const uploader = file.owners?.[0]?.displayName || file.owners?.[0]?.emailAddress || file.lastModifyingUser?.displayName || "-";

    tr.innerHTML = `
      <td title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</td>
      <td>${formatFileSize(file.size)}</td>
      <td>${escapeHtml(getFileExtension(file.name))}</td>
      <td>${escapeHtml(uploader)}</td>
      <td>${formatDate(file.createdTime)}</td>
      <td>
        <div class="action-group">
          <button class="btn small" data-action="download">下載</button>
          <button class="btn small" data-action="rename">改名</button>
          <button class="btn small danger" data-action="delete">刪除</button>
        </div>
      </td>`;

    tr.querySelector('[data-action="download"]').addEventListener("click", () => downloadFile(file));
    tr.querySelector('[data-action="rename"]').addEventListener("click", () => renameFile(file));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => deleteFile(file));
    fileTableBody.appendChild(tr);
  });
}

async function uploadSelectedFile() {
  if (!ensureReady()) return;

  const file = fileInput.files[0];
  if (!file) return showMessage("請先選擇檔案。", "error");
  if (file.size > CONFIG.MAX_FILE_SIZE_BYTES) return showMessage("單一檔案不可超過 1GB。", "error");

  try {
    showMessage("正在建立上傳工作...", "info");

    const metadata = { name: file.name, parents: [getFolderId()] };
    const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type || "application/octet-stream",
        "X-Upload-Content-Length": String(file.size)
      },
      body: JSON.stringify(metadata)
    });

    if (!initRes.ok) throw new Error(await readGoogleError(initRes));

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) throw new Error("無法取得 Google Drive resumable upload URL。");

    showMessage("正在上傳檔案，請勿關閉頁面...", "info");

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Length": String(file.size)
      },
      body: file
    });

    if (!uploadRes.ok) throw new Error(await readGoogleError(uploadRes));

    fileInput.value = "";
    showMessage("檔案上傳成功。", "success");
    listFiles();
  } catch (error) {
    showMessage(`上傳失敗：${error.message}`, "error");
  }
}

async function downloadFile(file) {
  if (!ensureReady()) return;

  try {
    showMessage(`正在下載：${file.name}`, "info");
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showMessage("下載完成。", "success");
  } catch (error) {
    showMessage(`下載失敗：${error.message}`, "error");
  }
}

async function renameFile(file) {
  if (!ensureReady()) return;

  const newName = prompt("請輸入新的檔案名稱：", file.name);
  if (!newName || newName.trim() === file.name) return;

  try {
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?fields=id,name`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ name: newName.trim() })
    });
    showMessage("檔名已更新。", "success");
    listFiles();
  } catch (error) {
    showMessage(`修改檔名失敗：${error.message}`, "error");
  }
}

async function deleteFile(file) {
  if (!ensureReady()) return;

  if (!confirm(`確定要刪除「${file.name}」嗎？此操作無法復原。`)) return;

  try {
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`, { method: "DELETE" });
    showMessage("檔案已刪除。", "success");
    listFiles();
  } catch (error) {
    showMessage(`刪除失敗：${error.message}`, "error");
  }
}

async function driveFetch(url, options = {}) {
  if (!accessToken) throw new Error("尚未登入 Google。");

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error(await readGoogleError(res));
  return res;
}

async function readGoogleError(res) {
  try {
    const data = await res.json();
    return data.error?.message || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

function ensureReady() {
  if (!getGoogleClientId()) {
    showMessage("請先到 Settings 設定 Google OAuth Client ID。", "error");
    switchToSettingsTab();
    return false;
  }

  if (!accessToken) {
    showMessage("請先登入 Google。", "error");
    return false;
  }

  if (!getFolderId()) {
    showMessage("請先到 Settings 設定 Google Drive 資料夾 ID。", "error");
    switchToSettingsTab();
    return false;
  }

  return true;
}

function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchToSettingsTab() {
  switchTab("settings");
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
  document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add("active");

  document.getElementById("filesTab").classList.remove("active");
  document.getElementById("settingsTab").classList.remove("active");
  document.getElementById(tabName === "files" ? "filesTab" : "settingsTab").classList.add("active");
}

function showMessage(message, type = "info") {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
  setTimeout(() => messageBox.classList.add("hidden"), 5000);
}

function isValidClientIdFormat(clientId) {
  return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId);
}

function maskClientId(clientId) {
  if (clientId.length <= 20) return clientId;
  return `${clientId.slice(0, 10)}...${clientId.slice(-24)}`;
}

function formatFileSize(size) {
  if (!size) return "-";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(size);
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function getFileExtension(name) {
  const index = name.lastIndexOf(".");
  return index === -1 || index === name.length - 1 ? "-" : name.substring(index + 1).toLowerCase();
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeDriveQuery(str = "") {
  return String(str).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(console.warn);
    });
  }
}

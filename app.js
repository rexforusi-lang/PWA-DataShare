/**
 * Google Drive PWA File Manager
 * Version: 1.0.0
 */
const CONFIG = window.APP_CONFIG;
const STORAGE_KEYS = { FOLDER_ID: "drive_pwa_folder_id" };
let tokenClient = null;
let accessToken = null;
let currentUserEmail = "";

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");
const folderStatus = document.getElementById("folderStatus");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const refreshBtn = document.getElementById("refreshBtn");
const fileTableBody = document.getElementById("fileTableBody");
const messageBox = document.getElementById("messageBox");
const folderIdInput = document.getElementById("folderIdInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
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
  checkUpdateBtn.addEventListener("click", checkForUpdates);
  updateFolderStatus();
  waitForGoogleIdentity();
}

function waitForGoogleIdentity(retry = 0) {
  if (window.google && window.google.accounts) return initGoogleIdentity();
  if (retry > 30) return showMessage("Google Identity Services 載入逾時，請重新整理頁面。", "error");
  setTimeout(() => waitForGoogleIdentity(retry + 1), 200);
}

function initGoogleIdentity() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    scope: CONFIG.SCOPES,
    callback: async (tokenResponse) => {
      if (tokenResponse.error) return showMessage(`登入失敗：${tokenResponse.error}`, "error");
      accessToken = tokenResponse.access_token;
      await loadUserProfile();
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      loginStatus.textContent = currentUserEmail ? `已登入：${currentUserEmail}` : "已登入 Google";
      showMessage("登入成功。", "success");
      listFiles();
    }
  });
}

function signIn() {
  if (!tokenClient) return showMessage("Google OAuth 尚未初始化。", "error");
  tokenClient.requestAccessToken({ prompt: "consent" });
}

function signOut() {
  if (accessToken && window.google) google.accounts.oauth2.revoke(accessToken);
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
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return;
    const data = await res.json();
    currentUserEmail = data.email || "";
  } catch { currentUserEmail = ""; }
}

function getFolderId() { return localStorage.getItem(STORAGE_KEYS.FOLDER_ID) || ""; }

function saveSettings() {
  const folderId = folderIdInput.value.trim();
  if (!folderId) return showMessage("請輸入 Google Drive 資料夾 ID。", "error");
  localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folderId);
  updateFolderStatus();
  showMessage("設定已儲存。", "success");
  if (accessToken) listFiles();
}

function initSettings() {
  currentVersion.value = CONFIG.APP_VERSION;
  folderIdInput.value = getFolderId();
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
  const folderId = getFolderId();
  fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">載入中...</td></tr>`;
  const query = `'${escapeDriveQuery(folderId)}' in parents and trashed = false`;
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
      <td><div class="action-group">
        <button class="btn small" data-action="download">下載</button>
        <button class="btn small" data-action="rename">改名</button>
        <button class="btn small danger" data-action="delete">刪除</button>
      </div></td>`;
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
      headers: { "Content-Type": file.type || "application/octet-stream", "Content-Length": String(file.size) },
      body: file
    });
    if (!uploadRes.ok) throw new Error(await readGoogleError(uploadRes));
    fileInput.value = "";
    showMessage("檔案上傳成功。", "success");
    listFiles();
  } catch (error) { showMessage(`上傳失敗：${error.message}`, "error"); }
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
  } catch (error) { showMessage(`下載失敗：${error.message}`, "error"); }
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
  } catch (error) { showMessage(`修改檔名失敗：${error.message}`, "error"); }
}

async function deleteFile(file) {
  if (!ensureReady()) return;
  if (!confirm(`確定要刪除「${file.name}」嗎？此操作無法復原。`)) return;
  try {
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`, { method: "DELETE" });
    showMessage("檔案已刪除。", "success");
    listFiles();
  } catch (error) { showMessage(`刪除失敗：${error.message}`, "error"); }
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
  try { const data = await res.json(); return data.error?.message || `${res.status} ${res.statusText}`; }
  catch { return `${res.status} ${res.statusText}`; }
}

function ensureReady() {
  if (!accessToken) { showMessage("請先登入 Google。", "error"); return false; }
  if (!getFolderId()) { showMessage("請先到 Settings 設定 Google Drive 資料夾 ID。", "error"); return false; }
  return true;
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".tab");
  const filesTab = document.getElementById("filesTab");
  const settingsTab = document.getElementById("settingsTab");
  tabButtons.forEach((btn) => btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filesTab.classList.remove("active");
    settingsTab.classList.remove("active");
    (btn.dataset.tab === "files" ? filesTab : settingsTab).classList.add("active");
  }));
}

function showMessage(message, type = "info") {
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
  setTimeout(() => messageBox.classList.add("hidden"), 5000);
}

function formatFileSize(size) {
  if (!size) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(size), index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}
function getFileExtension(name) { const index = name.lastIndexOf("."); return index === -1 || index === name.length - 1 ? "-" : name.substring(index + 1).toLowerCase(); }
function formatDate(dateString) { if (!dateString) return "-"; return new Intl.DateTimeFormat("zh-TW", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(dateString)); }
function escapeHtml(str = "") { return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function escapeDriveQuery(str = "") { return String(str).replaceAll("\\", "\\\\").replaceAll("'", "\\'"); }
function registerServiceWorker() {
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.warn));
}

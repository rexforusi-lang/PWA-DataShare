/**
 * Google Drive PWA File Manager
 * Program: GoogleDrivePWA
 * Version: V0.5
 * Date: 2026-06-02
 *
 * Version log:
 * V0.5 - 2026-06-02
 * - 新增多檔案選擇與逐一上傳功能。
 * - 檔案 input 支援 multiple。
 * - 新增已選檔案數量、總大小與上傳進度顯示。
 * - 單一檔案仍限制最大 1GB，超過限制會略過且不中斷其他檔案上傳。
 * - 單檔上傳邏輯重構為 uploadSingleFile(file)。
 * - 多檔上傳完成後顯示成功、失敗與略過統計。
 * - 新增記住登入狀態與自動嘗試重新登入功能。
 * - 不將 access token 或 refresh token 寫入 localStorage。
 *
 * V0.4 - 2026-06-02
 * - 程式 APP_VERSION 改為與 ZIP 檔版本一致。
 * - Settings 新增 GitHub version.json URL 設定，支援自動清除 PWA 快取更新。
 *
 * V0.3 - 2026-06-02
 * - 新增 version.json 作為遠端版本資訊來源。
 *
 * V0.2 - 2026-06-02
 * - Settings 新增 Google OAuth Client ID 輸入欄位。
 *
 * V0.1 - 2026-06-02
 * - 初版 Google Drive PWA File Manager。
 */
const CONFIG = window.APP_CONFIG;
const STORAGE_KEYS = {
  FOLDER_ID: "drive_pwa_folder_id",
  GOOGLE_CLIENT_ID: "drive_pwa_google_client_id",
  VERSION_CHECK_URL: "drive_pwa_version_check_url",
  REMEMBER_LOGIN: "drive_pwa_remember_login",
  LAST_LOGIN_EMAIL: "drive_pwa_last_login_email",
  LAST_LOGIN_TIME: "drive_pwa_last_login_time"
};
let tokenClient = null, accessToken = null, currentUserEmail = "", initializedClientId = "", autoSignInTried = false;

const $ = (id) => document.getElementById(id);
const loginBtn = $("loginBtn"), logoutBtn = $("logoutBtn"), loginStatus = $("loginStatus"), clientIdStatus = $("clientIdStatus"), folderStatus = $("folderStatus");
const fileInput = $("fileInput"), uploadBtn = $("uploadBtn"), refreshBtn = $("refreshBtn"), fileTableBody = $("fileTableBody"), messageBox = $("messageBox");
const uploadInfo = $("uploadInfo"), selectedFileInfo = $("selectedFileInfo"), uploadProgressText = $("uploadProgressText"), uploadProgressBar = $("uploadProgressBar");
const clientIdInput = $("clientIdInput"), folderIdInput = $("folderIdInput"), versionUrlInput = $("versionUrlInput"), rememberLoginInput = $("rememberLoginInput"), lastLoginInfo = $("lastLoginInfo");
const saveSettingsBtn = $("saveSettingsBtn"), clearSettingsBtn = $("clearSettingsBtn"), currentVersion = $("currentVersion"), cacheVersion = $("cacheVersion"), githubLatestVersion = $("githubLatestVersion");
const checkUpdateBtn = $("checkUpdateBtn"), updateResult = $("updateResult");

document.addEventListener("DOMContentLoaded", initApp);
function initApp() {
  initTabs(); initSettings(); registerServiceWorker();
  loginBtn.addEventListener("click", signIn); logoutBtn.addEventListener("click", signOut);
  uploadBtn.addEventListener("click", uploadSelectedFiles); refreshBtn.addEventListener("click", listFiles);
  fileInput.addEventListener("change", updateSelectedFileInfo);
  saveSettingsBtn.addEventListener("click", saveSettings); clearSettingsBtn.addEventListener("click", clearLocalSettings); checkUpdateBtn.addEventListener("click", checkForUpdates);
  updateClientIdStatus(); updateFolderStatus(); waitForGoogleIdentity();
}
function waitForGoogleIdentity(retry = 0) {
  if (window.google && window.google.accounts) { initGoogleIdentityIfPossible(); return; }
  if (retry > 30) { showMessage("Google Identity Services 載入逾時，請確認網路連線後重新整理。", "error"); return; }
  setTimeout(() => waitForGoogleIdentity(retry + 1), 200);
}
function initGoogleIdentityIfPossible() {
  const clientId = getGoogleClientId();
  if (!clientId) { loginBtn.disabled = true; showMessage("請先到 Settings 設定 Google OAuth Client ID，儲存後再登入。", "info"); return; }
  if (!isValidClientIdFormat(clientId)) { loginBtn.disabled = true; showMessage("OAuth Client ID 格式不正確，請到 Settings 修正。", "error"); return; }
  initializedClientId = clientId;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: CONFIG.SCOPES,
    callback: handleTokenResponse,
    error_callback: handleTokenError
  });
  loginBtn.disabled = false;
  if (getRememberLogin() && !autoSignInTried) autoSignIn();
}
async function handleTokenResponse(tokenResponse) {
  if (tokenResponse.error) { showMessage(`登入失敗：${tokenResponse.error}`, "error"); return; }
  accessToken = tokenResponse.access_token;
  await loadUserProfile();
  loginBtn.classList.add("hidden"); logoutBtn.classList.remove("hidden");
  loginStatus.textContent = currentUserEmail ? `已登入：${currentUserEmail}` : "已登入 Google";
  if (getRememberLogin()) saveLoginState(currentUserEmail);
  showMessage("登入成功。", "success");
  listFiles();
}
function handleTokenError(error) {
  if (error.type === "popup_failed_to_open") showMessage("登入視窗無法開啟，請允許瀏覽器彈出視窗。", "error");
  else if (error.type === "popup_closed") showMessage("登入視窗已關閉，尚未完成授權。", "info");
  else showMessage(`登入發生錯誤：${JSON.stringify(error)}`, "error");
}
function signIn() {
  const clientId = getGoogleClientId();
  if (!clientId) { showMessage("請先到 Settings 設定 Google OAuth Client ID。", "error"); switchToSettingsTab(); return; }
  if (!tokenClient || initializedClientId !== clientId) initGoogleIdentityIfPossible();
  if (!tokenClient) { showMessage("Google OAuth 尚未初始化，請確認 Client ID 後重新整理頁面。", "error"); return; }
  tokenClient.requestAccessToken({ prompt: "consent" });
}
async function autoSignIn() {
  if (!tokenClient || autoSignInTried) return;
  autoSignInTried = true;
  const lastEmail = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_EMAIL) || "";
  loginStatus.textContent = lastEmail ? `正在嘗試自動登入：${lastEmail}` : "正在嘗試自動登入...";
  try { tokenClient.requestAccessToken({ prompt: "" }); }
  catch { loginStatus.textContent = "自動登入失敗，請手動登入"; }
}
function signOut() {
  if (accessToken && window.google) google.accounts.oauth2.revoke(accessToken);
  accessToken = null; currentUserEmail = ""; clearLoginState();
  loginBtn.classList.remove("hidden"); logoutBtn.classList.add("hidden"); loginStatus.textContent = "尚未登入";
  fileTableBody.innerHTML = `<tr><td colspan="6" class="empty">請先登入</td></tr>`;
  showMessage("已登出，已清除登入記憶。", "success");
}
async function loadUserProfile() {
  try { const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }); if (!res.ok) return; const data = await res.json(); currentUserEmail = data.email || ""; } catch { currentUserEmail = ""; }
}
function getGoogleClientId(){return localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID)||"";}
function getFolderId(){return localStorage.getItem(STORAGE_KEYS.FOLDER_ID)||"";}
function getVersionCheckUrl(){return localStorage.getItem(STORAGE_KEYS.VERSION_CHECK_URL)||CONFIG.DEFAULT_VERSION_CHECK_URL||"./version.json";}
function getRememberLogin(){return localStorage.getItem(STORAGE_KEYS.REMEMBER_LOGIN)==="true";}
function saveLoginState(email){localStorage.setItem(STORAGE_KEYS.REMEMBER_LOGIN,"true"); if(email)localStorage.setItem(STORAGE_KEYS.LAST_LOGIN_EMAIL,email); localStorage.setItem(STORAGE_KEYS.LAST_LOGIN_TIME,new Date().toISOString()); updateLastLoginInfo();}
function clearLoginState(){localStorage.removeItem(STORAGE_KEYS.REMEMBER_LOGIN); localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_EMAIL); localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN_TIME); if(rememberLoginInput) rememberLoginInput.checked=false; updateLastLoginInfo();}
function updateLastLoginInfo(){const email=localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_EMAIL), time=localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_TIME); lastLoginInfo.textContent=email?`上次登入：${email}，時間：${formatDate(time)}`:"尚未記錄登入狀態";}
function saveSettings() {
  const clientId = clientIdInput.value.trim(), folderId = folderIdInput.value.trim(), versionUrl = versionUrlInput.value.trim() || CONFIG.DEFAULT_VERSION_CHECK_URL;
  if (!clientId) return showMessage("請輸入 Google OAuth Client ID。", "error");
  if (!isValidClientIdFormat(clientId)) return showMessage("Google OAuth Client ID 格式不正確，應以 .apps.googleusercontent.com 結尾。", "error");
  if (!folderId) return showMessage("請輸入 Google Drive 資料夾 ID。", "error");
  const previousClientId = getGoogleClientId();
  localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, clientId); localStorage.setItem(STORAGE_KEYS.FOLDER_ID, folderId); localStorage.setItem(STORAGE_KEYS.VERSION_CHECK_URL, versionUrl);
  localStorage.setItem(STORAGE_KEYS.REMEMBER_LOGIN, rememberLoginInput.checked ? "true" : "false");
  updateClientIdStatus(); updateFolderStatus(); updateLastLoginInfo();
  if (previousClientId !== clientId) { tokenClient=null; accessToken=null; initializedClientId=""; autoSignInTried=false; loginBtn.classList.remove("hidden"); logoutBtn.classList.add("hidden"); loginStatus.textContent="尚未登入"; initGoogleIdentityIfPossible(); showMessage("設定已儲存於本機。OAuth Client ID 已更新，請重新登入 Google。", "success"); return; }
  showMessage("設定已儲存於本機。", "success"); if(accessToken) listFiles();
}
function clearLocalSettings() {
  if (!confirm("確定要清除本機儲存的 OAuth Client ID、Folder ID、GitHub version.json URL 與登入記憶嗎？")) return;
  Object.values(STORAGE_KEYS).forEach((key)=>localStorage.removeItem(key));
  clientIdInput.value=""; folderIdInput.value=""; versionUrlInput.value=CONFIG.DEFAULT_VERSION_CHECK_URL; rememberLoginInput.checked=false; githubLatestVersion.value="尚未檢查";
  tokenClient=null; accessToken=null; initializedClientId=""; autoSignInTried=false; loginBtn.disabled=true; loginBtn.classList.remove("hidden"); logoutBtn.classList.add("hidden"); loginStatus.textContent="尚未登入";
  updateClientIdStatus(); updateFolderStatus(); updateLastLoginInfo(); fileTableBody.innerHTML=`<tr><td colspan="6" class="empty">請先到 Settings 設定 OAuth Client ID 與資料夾 ID。</td></tr>`; showMessage("本機設定已清除。", "success");
}
function initSettings(){currentVersion.value=CONFIG.APP_VERSION; cacheVersion.value=CONFIG.CACHE_NAME; githubLatestVersion.value="尚未檢查"; clientIdInput.value=getGoogleClientId(); folderIdInput.value=getFolderId(); versionUrlInput.value=getVersionCheckUrl(); rememberLoginInput.checked=getRememberLogin(); updateLastLoginInfo();}
function updateClientIdStatus(){const clientId=getGoogleClientId(); clientIdStatus.textContent=clientId?`OAuth Client ID：${maskClientId(clientId)}`:"尚未設定 OAuth Client ID";}
function updateFolderStatus(){const folderId=getFolderId(); folderStatus.textContent=folderId?`目前資料夾 ID：${folderId}`:"尚未設定資料夾 ID";}

function getSelectedFiles(){return Array.from(fileInput.files || []);}
function updateSelectedFileInfo(){const files=getSelectedFiles(); if(!files.length){uploadInfo.classList.add("hidden"); selectedFileInfo.textContent="尚未選擇檔案"; uploadProgressText.textContent=""; uploadProgressBar.value=0; return;} uploadInfo.classList.remove("hidden"); const total=files.reduce((s,f)=>s+f.size,0); selectedFileInfo.textContent=`已選擇 ${files.length} 個檔案，總大小：${formatFileSize(total)}`; uploadProgressText.textContent="等待上傳"; uploadProgressBar.value=0;}
function validateUploadFiles(files){const validFiles=[], skippedFiles=[]; for(const file of files){ if(file.size>CONFIG.MAX_FILE_SIZE_BYTES) skippedFiles.push({file, reason:"超過單檔 1GB 限制"}); else validFiles.push(file);} return {validFiles, skippedFiles};}
async function uploadSelectedFiles(){
  if(!ensureReady()) return;
  const files=getSelectedFiles();
  if(!files.length) return showMessage("請先選擇一個或多個檔案。", "error");
  const {validFiles, skippedFiles}=validateUploadFiles(files), successList=[], failedList=[];
  if(!validFiles.length){renderUploadSummary(successList, failedList, skippedFiles); return;}
  uploadBtn.disabled=true; uploadInfo.classList.remove("hidden"); uploadProgressBar.value=0;
  for(let i=0;i<validFiles.length;i++){
    const file=validFiles[i]; updateUploadProgress(i+1, validFiles.length, file.name);
    try{const uploaded=await uploadSingleFile(file); successList.push({file, uploaded});}
    catch(error){failedList.push({file, reason:error.message});}
    uploadProgressBar.value=Math.round(((i+1)/validFiles.length)*100);
  }
  uploadBtn.disabled=false; fileInput.value=""; updateSelectedFileInfo(); renderUploadSummary(successList, failedList, skippedFiles); listFiles();
}
async function uploadSingleFile(file){
  const metadata={name:file.name, parents:[getFolderId()]};
  const initRes=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,createdTime",{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":file.type||"application/octet-stream","X-Upload-Content-Length":String(file.size)},body:JSON.stringify(metadata)});
  if(!initRes.ok) throw new Error(await readGoogleError(initRes));
  const uploadUrl=initRes.headers.get("Location"); if(!uploadUrl) throw new Error("無法取得 Google Drive resumable upload URL。");
  const uploadRes=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":file.type||"application/octet-stream","Content-Length":String(file.size)},body:file});
  if(!uploadRes.ok) throw new Error(await readGoogleError(uploadRes));
  return uploadRes.json();
}
function updateUploadProgress(current,total,fileName){uploadProgressText.textContent=`正在上傳 ${current} / ${total}：${fileName}`; uploadProgressBar.value=Math.round(((current-1)/total)*100);}
function renderUploadSummary(successList, failedList, skippedList){
  const parts=[`上傳完成：成功 ${successList.length} 個，失敗 ${failedList.length} 個，略過 ${skippedList.length} 個。`];
  if(failedList.length) parts.push("失敗："+failedList.map(x=>`${x.file.name}（${x.reason}）`).join("；"));
  if(skippedList.length) parts.push("略過："+skippedList.map(x=>`${x.file.name}（${x.reason}）`).join("；"));
  showMessage(parts.join("\n"), failedList.length?"error":"success");
}

async function checkForUpdates(){const previousText=checkUpdateBtn.textContent; checkUpdateBtn.disabled=true; checkUpdateBtn.textContent="檢查中..."; updateResult.className="update-result hint"; updateResult.innerHTML="正在檢查 GitHub 版本..."; try{const res=await fetch(buildCacheBustingUrl(getVersionCheckUrl()),{cache:"no-store",headers:{"Cache-Control":"no-cache"}}); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`); const info=await res.json(); validateVersionInfo(info); githubLatestVersion.value=info.latestVersion; const hasUpdate=compareVersions(info.latestVersion,CONFIG.APP_VERSION)>0; updateResult.className=`update-result ${hasUpdate?"update-available":"up-to-date"}`; updateResult.innerHTML=`<div><strong>${hasUpdate?"發現新版本，準備自動更新":"目前已是最新版本"}</strong></div><div>目前執行版本：${escapeHtml(CONFIG.APP_VERSION)}</div><div>GitHub 最新版本：${escapeHtml(info.latestVersion)}</div><div>發布日期：${escapeHtml(info.releaseDate||"-")}</div><div>更新說明：${escapeHtml(info.releaseNote||"-")}</div>`; if(hasUpdate){updateResult.innerHTML+=`<div class="hint">正在清除本機 PWA 快取並重新載入，localStorage 設定會保留。</div>`; await delay(800); await applyPwaUpdate();}}catch(error){updateResult.className="update-result update-error"; updateResult.innerHTML=`檢查更新失敗：${escapeHtml(error.message)}`;}finally{checkUpdateBtn.disabled=false; checkUpdateBtn.textContent=previousText;}}
async function applyPwaUpdate(){if("serviceWorker" in navigator){const regs=await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r=>r.unregister()));} if("caches" in window){const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k)));} await delay(500); window.location.reload();}
function buildCacheBustingUrl(url){return `${url}${url.includes("?")?"&":"?"}t=${Date.now()}`;}
function validateVersionInfo(info){if(!info||typeof info!=="object") throw new Error("version.json 格式錯誤。"); if(!info.latestVersion) throw new Error("version.json 缺少 latestVersion 欄位。");}
function normalizeVersion(v){return String(v).trim().replace(/^v/i,"");}
function compareVersions(a,b){const pa=normalizeVersion(a).split(".").map(n=>parseInt(n,10)||0), pb=normalizeVersion(b).split(".").map(n=>parseInt(n,10)||0), len=Math.max(pa.length,pb.length); for(let i=0;i<len;i++){if((pa[i]||0)>(pb[i]||0))return 1; if((pa[i]||0)<(pb[i]||0))return -1;} return 0;}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function listFiles(){if(!ensureReady()) return; fileTableBody.innerHTML=`<tr><td colspan="6" class="empty">載入中...</td></tr>`; const query=`'${escapeDriveQuery(getFolderId())}' in parents and trashed = false`; const params=new URLSearchParams({q:query,pageSize:"100",orderBy:"createdTime desc",fields:"files(id,name,mimeType,size,createdTime,modifiedTime,owners(displayName,emailAddress),lastModifyingUser(displayName,emailAddress),webContentLink)"}); try{const res=await driveFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`); const data=await res.json(); renderFileTable(data.files||[]);}catch(error){showMessage(`讀取檔案失敗：${error.message}`,"error"); fileTableBody.innerHTML=`<tr><td colspan="6" class="empty">讀取失敗</td></tr>`;}}
function renderFileTable(files){if(!files.length){fileTableBody.innerHTML=`<tr><td colspan="6" class="empty">此資料夾目前沒有檔案</td></tr>`; return;} fileTableBody.innerHTML=""; files.forEach(file=>{const tr=document.createElement("tr"), uploader=file.owners?.[0]?.displayName||file.owners?.[0]?.emailAddress||file.lastModifyingUser?.displayName||"-"; tr.innerHTML=`<td title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</td><td>${formatFileSize(file.size)}</td><td>${escapeHtml(getFileExtension(file.name))}</td><td>${escapeHtml(uploader)}</td><td>${formatDate(file.createdTime)}</td><td><div class="action-group"><button class="btn small" data-action="download">下載</button><button class="btn small" data-action="rename">改名</button><button class="btn small danger" data-action="delete">刪除</button></div></td>`; tr.querySelector('[data-action="download"]').addEventListener("click",()=>downloadFile(file)); tr.querySelector('[data-action="rename"]').addEventListener("click",()=>renameFile(file)); tr.querySelector('[data-action="delete"]').addEventListener("click",()=>deleteFile(file)); fileTableBody.appendChild(tr);});}
async function downloadFile(file){if(!ensureReady()) return; try{showMessage(`正在下載：${file.name}`,"info"); const res=await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`); const blob=await res.blob(); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=file.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); showMessage("下載完成。","success");}catch(error){showMessage(`下載失敗：${error.message}`,"error");}}
async function renameFile(file){if(!ensureReady()) return; const newName=prompt("請輸入新的檔案名稱：",file.name); if(!newName||newName.trim()===file.name)return; try{await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?fields=id,name`,{method:"PATCH",headers:{"Content-Type":"application/json; charset=UTF-8"},body:JSON.stringify({name:newName.trim()})}); showMessage("檔名已更新。","success"); listFiles();}catch(error){showMessage(`修改檔名失敗：${error.message}`,"error");}}
async function deleteFile(file){if(!ensureReady()) return; if(!confirm(`確定要刪除「${file.name}」嗎？此操作無法復原。`))return; try{await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}`,{method:"DELETE"}); showMessage("檔案已刪除。","success"); listFiles();}catch(error){showMessage(`刪除失敗：${error.message}`,"error");}}
async function driveFetch(url,options={}){if(!accessToken) throw new Error("尚未登入 Google。"); const headers=new Headers(options.headers||{}); headers.set("Authorization",`Bearer ${accessToken}`); const res=await fetch(url,{...options,headers}); if(!res.ok) throw new Error(await readGoogleError(res)); return res;}
async function readGoogleError(res){try{const data=await res.json(); return data.error?.message||`${res.status} ${res.statusText}`;}catch{return `${res.status} ${res.statusText}`;}}
function ensureReady(){if(!getGoogleClientId()){showMessage("請先到 Settings 設定 Google OAuth Client ID。","error"); switchToSettingsTab(); return false;} if(!accessToken){showMessage("請先登入 Google。","error"); return false;} if(!getFolderId()){showMessage("請先到 Settings 設定 Google Drive 資料夾 ID。","error"); switchToSettingsTab(); return false;} return true;}
function initTabs(){document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));}
function switchToSettingsTab(){switchTab("settings");}
function switchTab(tabName){document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active")); document.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add("active"); $("filesTab").classList.remove("active"); $("settingsTab").classList.remove("active"); $(tabName==="files"?"filesTab":"settingsTab").classList.add("active");}
function showMessage(message,type="info"){messageBox.textContent=message; messageBox.className=`message ${type}`; setTimeout(()=>messageBox.classList.add("hidden"),8000);}
function isValidClientIdFormat(clientId){return /^\d+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId);}
function maskClientId(clientId){return clientId.length<=20?clientId:`${clientId.slice(0,10)}...${clientId.slice(-24)}`;}
function formatFileSize(size){if(!size)return"-"; const units=["B","KB","MB","GB","TB"]; let value=Number(size), index=0; while(value>=1024&&index<units.length-1){value/=1024; index++;} return `${value.toFixed(value>=10?0:1)} ${units[index]}`;}
function getFileExtension(name){const index=name.lastIndexOf("."); return index===-1||index===name.length-1?"-":name.substring(index+1).toLowerCase();}
function formatDate(dateString){if(!dateString)return"-"; return new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(dateString));}
function escapeHtml(str=""){return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function escapeDriveQuery(str=""){return String(str).replaceAll("\\","\\\\").replaceAll("'","\\'");}
function registerServiceWorker(){if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));}}

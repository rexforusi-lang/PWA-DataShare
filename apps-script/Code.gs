/**
 * GoogleDrivePWA V0.9 - Apps Script Upload Backend
 * 部署方式：Deploy > New deployment > Web app
 * Execute as: Me
 * Who has access: Anyone
 * 注意：請自行設定 FOLDER_ID 與 SECRET_KEY，不要公開 SECRET_KEY。
 */
const FOLDER_ID = 'PUT_YOUR_DRIVE_FOLDER_ID_HERE';
const SECRET_KEY = 'PUT_YOUR_SECRET_KEY_HERE';
const MAX_FILE_SIZE_MB = 10;
const ALLOWED_EXTENSIONS = ['jpg','jpeg','png','gif','pdf','xlsx','xls','docx','doc','pptx','txt','csv','zip'];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    if (!data.secret || data.secret !== SECRET_KEY) return jsonOutput({ ok: false, error: 'Unauthorized' });
    if (!data.filename || !data.base64) return jsonOutput({ ok: false, error: 'Missing filename or file data' });

    const ext = String(data.filename).split('.').pop().toLowerCase();
    if (ALLOWED_EXTENSIONS.length && ALLOWED_EXTENSIONS.indexOf(ext) === -1) {
      return jsonOutput({ ok: false, error: 'File extension is not allowed: ' + ext });
    }

    const bytes = Utilities.base64Decode(data.base64);
    if (bytes.length > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return jsonOutput({ ok: false, error: 'File exceeds ' + MAX_FILE_SIZE_MB + ' MB limit' });
    }

    const blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', data.filename);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    return jsonOutput({ ok: true, filename: file.getName(), fileId: file.getId(), fileUrl: file.getUrl(), size: bytes.length });
  } catch (err) {
    return jsonOutput({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return jsonOutput({ ok: true, message: 'GoogleDrivePWA upload endpoint is running.' });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

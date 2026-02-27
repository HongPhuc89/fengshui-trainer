/**
 * Django Admin — Video Upload Progress Bar
 *
 * Hoạt động:
 * 1. Khi user chọn file video → hiện thông tin file
 * 2. Khi submit form có video → intercept, dùng XHR + onprogress
 * 3. Hiện overlay progress bar trong suốt quá trình upload + server xử lý
 * 4. Xong → redirect theo Django Admin response
 */
(function () {
  'use strict';

  var fileInput, clickedButton;

  // ── Styles ────────────────────────────────────────────────────────────────
  var STYLES = [
    '#vup-overlay {',
    '  position:fixed;inset:0;z-index:99999;',
    '  background:rgba(0,0,0,0.65);backdrop-filter:blur(3px);',
    '  display:flex;align-items:center;justify-content:center;',
    '}',
    '#vup-box {',
    '  background:#1a1a1a;border:1px solid #333;border-radius:10px;',
    '  padding:28px 32px;width:420px;max-width:90vw;',
    '  font-family:system-ui,sans-serif;',
    '}',
    '#vup-title {',
    '  font-size:15px;font-weight:700;color:#fff;',
    '  margin:0 0 6px;display:flex;align-items:center;gap:8px;',
    '}',
    '#vup-filename {',
    '  font-size:12px;color:#888;margin:0 0 18px;',
    '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    '}',
    '#vup-bar-wrap {',
    '  height:10px;background:#2a2a2a;border-radius:5px;overflow:hidden;margin-bottom:10px;',
    '}',
    '#vup-bar {',
    '  height:100%;border-radius:5px;width:0%;',
    '  background:#1d6949;transition:width 0.25s ease;',
    '}',
    '#vup-bar.processing {',
    '  background:linear-gradient(90deg,#1d6949,#2d9e6b,#1d6949);',
    '  background-size:200% 100%;width:100% !important;',
    '  animation:vup-shimmer 1.4s infinite;',
    '}',
    '#vup-bar.done { background:#2d9e6b; }',
    '@keyframes vup-shimmer {',
    '  0%{background-position:200% center}',
    '  100%{background-position:-200% center}',
    '}',
    '#vup-meta {',
    '  display:flex;justify-content:space-between;align-items:center;',
    '  margin-bottom:18px;',
    '}',
    '#vup-label { font-size:13px;color:#aaa; }',
    '#vup-pct   { font-size:13px;font-weight:700;color:#1d6949;font-variant-numeric:tabular-nums; }',
    '#vup-steps {',
    '  display:flex;align-items:center;gap:0;',
    '}',
    '.vup-step {',
    '  display:flex;flex-direction:column;align-items:center;gap:5px;',
    '  font-size:11px;color:#555;transition:color 0.3s;',
    '}',
    '.vup-step.active { color:#1d6949; }',
    '.vup-step.done   { color:#aaa; }',
    '.vup-dot {',
    '  width:10px;height:10px;border-radius:50%;',
    '  background:#333;transition:background 0.3s;',
    '}',
    '.vup-step.active .vup-dot { background:#1d6949;box-shadow:0 0 0 3px rgba(29,105,73,.25); }',
    '.vup-step.done   .vup-dot { background:#555; }',
    '.vup-line { flex:1;height:1px;background:#333;margin-bottom:15px;transition:background 0.3s; }',
    '.vup-line.done { background:#555; }',
    '#vup-file-info {',
    '  margin-top:6px;font-size:12px;color:#888;',
    '}',
  ].join('\n');

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  // ── Overlay DOM ───────────────────────────────────────────────────────────
  function createOverlay(filename) {
    var div = document.createElement('div');
    div.id = 'vup-overlay';
    div.innerHTML = [
      '<div id="vup-box">',
      '  <p id="vup-title">',
      '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1d6949" stroke-width="2.5">',
      '      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      '    </svg>',
      '    Đang upload video',
      '  </p>',
      '  <p id="vup-filename">' + escapeHtml(filename) + '</p>',
      '  <div id="vup-bar-wrap"><div id="vup-bar"></div></div>',
      '  <div id="vup-meta">',
      '    <span id="vup-label">Đang tải lên...</span>',
      '    <span id="vup-pct">0%</span>',
      '  </div>',
      '  <div id="vup-steps">',
      '    <div class="vup-step active" id="step-upload">',
      '      <div class="vup-dot"></div><span>Tải lên</span>',
      '    </div>',
      '    <div class="vup-line" id="line-1"></div>',
      '    <div class="vup-step" id="step-process">',
      '      <div class="vup-dot"></div><span>Xử lý</span>',
      '    </div>',
      '    <div class="vup-line" id="line-2"></div>',
      '    <div class="vup-step" id="step-done">',
      '      <div class="vup-dot"></div><span>Hoàn tất</span>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
    return div;
  }

  function setUploadProgress(pct, loadedBytes, totalBytes) {
    var bar = document.getElementById('vup-bar');
    var label = document.getElementById('vup-label');
    var pctEl = document.getElementById('vup-pct');
    if (!bar) return;
    bar.style.width = pct + '%';
    bar.className = '';
    var loadedMB = (loadedBytes / 1024 / 1024).toFixed(1);
    var totalMB  = (totalBytes  / 1024 / 1024).toFixed(1);
    label.textContent = 'Đang tải lên... ' + loadedMB + ' MB / ' + totalMB + ' MB';
    pctEl.textContent = pct + '%';
  }

  function setProcessingState() {
    var bar   = document.getElementById('vup-bar');
    var label = document.getElementById('vup-label');
    var pctEl = document.getElementById('vup-pct');
    if (!bar) return;
    bar.className = 'processing';
    label.textContent = 'Đang xử lý video (ffmpeg)...';
    pctEl.textContent = '';

    // Steps: upload done, processing active
    setStepDone('step-upload');
    setStepDone('line-1');
    setStepActive('step-process');
  }

  function setDoneState() {
    var bar   = document.getElementById('vup-bar');
    var label = document.getElementById('vup-label');
    var pctEl = document.getElementById('vup-pct');
    if (!bar) return;
    bar.className = 'done';
    bar.style.width = '100%';
    label.textContent = 'Hoàn thành! Đang chuyển trang...';
    pctEl.textContent = '✓';

    setStepDone('step-process');
    setStepDone('line-2');
    setStepDone('step-done');
  }

  function setStepActive(id) {
    var el = document.getElementById(id);
    if (el) el.className = el.className.replace('done','').replace('active','').trim() + ' active';
  }

  function setStepDone(id) {
    var el = document.getElementById(id);
    if (el) el.className = el.className.replace('active','').replace('done','').trim() + ' done';
  }

  // ── Form intercept ────────────────────────────────────────────────────────
  function submitWithProgress(form, file) {
    var overlay = createOverlay(file.name);
    document.body.appendChild(overlay);

    var formData = new FormData(form);

    // Include which Save button was clicked
    if (clickedButton && clickedButton.name) {
      formData.set(clickedButton.name, clickedButton.value || '1');
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', form.action || window.location.href);

    // Django CSRF — already in form via csrfmiddlewaretoken input
    xhr.withCredentials = true;

    // Upload progress (bytes đang gửi lên server)
    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100), e.loaded, e.total);
      }
    });

    // Upload bytes xong → server đang chạy ffmpeg
    xhr.upload.addEventListener('load', function () {
      setProcessingState();
    });

    // Server trả response (bao gồm redirect Django đã follow)
    xhr.addEventListener('load', function () {
      setDoneState();
      // Redirect sau 400ms để user thấy "done"
      setTimeout(function () {
        window.location.href = xhr.responseURL || window.location.href;
      }, 400);
    });

    xhr.addEventListener('error', function () {
      document.body.removeChild(overlay);
      alert('Upload thất bại — lỗi kết nối. Vui lòng thử lại.');
    });

    xhr.send(formData);
  }

  // ── File info helper (hiện dưới input) ───────────────────────────────────
  function showFileInfo(file) {
    var info = document.getElementById('vup-file-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'vup-file-info';
      fileInput.parentNode.insertBefore(info, fileInput.nextSibling);
    }
    var mb = (file.size / 1024 / 1024).toFixed(1);
    info.textContent = '📹 ' + file.name + ' — ' + mb + ' MB';
    info.style.cssText = 'margin-top:6px;font-size:12px;color:#888;';
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function(c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    fileInput = document.getElementById('id_video_upload');
    if (!fileInput) return;

    // Hiện file info khi chọn file
    fileInput.addEventListener('change', function () {
      var file = this.files[0];
      if (file) showFileInfo(file);
    });

    // Ghi nhớ button nào được click (Save / Save and continue / Save and add)
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('input[type=submit], button[type=submit]');
      if (btn) clickedButton = btn;
    });

    // Intercept submit
    var form = fileInput.closest('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      var file = fileInput.files[0];
      if (!file) return; // Không có file → submit bình thường

      e.preventDefault();
      submitWithProgress(form, file);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

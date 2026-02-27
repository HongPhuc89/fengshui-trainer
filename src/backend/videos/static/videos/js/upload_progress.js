/**
 * Django Admin — Bunny Stream TUS Direct Upload
 *
 * Luồng hoạt động:
 *  1. User chọn file video → hiện thông tin file
 *  2. User nhấn Save (hoặc nút Save bất kỳ) với file đã chọn
 *  3. JS intercept submit → hiện overlay upload
 *  4. Gọi /api/videos/lessons/{public_id}/upload/init/ → lấy TUS auth từ Bunny
 *  5. Upload file TRỰC TIẾP từ browser lên Bunny qua TUS (có thanh tiến trình thật)
 *  6. Gọi /api/videos/lessons/{public_id}/upload/complete/ → lưu video_id/video_url
 *  7. Poll /api/videos/lessons/{public_id}/upload/status/ → hiện tiến trình transcode
 *  8. Sau khi transcode xong → submit form Django (lưu các field khác) → redirect
 *
 * Nếu không có Bunny (VIDEO_STORAGE_BACKEND != bunny), bước init trả lỗi và upload
 * bị hủy với thông báo rõ ràng.
 */
(function () {
  'use strict';

  var CHUNK_SIZE   = 5 * 1024 * 1024;  // 5 MB per TUS PATCH
  var POLL_INTERVAL = 3000;             // 3s between transcoding polls

  var fileInput, clickedButton;

  // ── CSRF ──────────────────────────────────────────────────────────────────
  function getCsrf() {
    var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  var STYLES = [
    '#vup-overlay{position:fixed;inset:0;z-index:99999;',
    'background:rgba(0,0,0,0.7);backdrop-filter:blur(3px);',
    'display:flex;align-items:center;justify-content:center;}',

    '#vup-box{background:#1a1a1a;border:1px solid #333;border-radius:10px;',
    'padding:28px 32px;width:440px;max-width:92vw;font-family:system-ui,sans-serif;}',

    '#vup-title{font-size:15px;font-weight:700;color:#fff;',
    'margin:0 0 5px;display:flex;align-items:center;gap:8px;}',

    '#vup-filename{font-size:12px;color:#888;margin:0 0 18px;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

    '#vup-bar-wrap{height:10px;background:#2a2a2a;border-radius:5px;overflow:hidden;margin-bottom:10px;}',

    '#vup-bar{height:100%;border-radius:5px;width:0%;background:#1d6949;transition:width 0.2s ease;}',
    '#vup-bar.shimmer{background:linear-gradient(90deg,#1d6949,#2d9e6b,#1d6949);',
    'background-size:200% 100%;width:100%!important;animation:vup-sh 1.4s infinite;}',
    '#vup-bar.done{background:#2d9e6b;width:100%!important;}',
    '#vup-bar.error{background:#c0392b;width:100%!important;}',

    '@keyframes vup-sh{0%{background-position:200% center}100%{background-position:-200% center}}',

    '#vup-meta{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}',
    '#vup-label{font-size:13px;color:#aaa;}',
    '#vup-pct{font-size:13px;font-weight:700;color:#2d9e6b;font-variant-numeric:tabular-nums;}',

    '#vup-steps{display:flex;align-items:center;}',
    '.vup-step{display:flex;flex-direction:column;align-items:center;gap:5px;',
    'font-size:11px;color:#555;transition:color 0.3s;white-space:nowrap;}',
    '.vup-step.active{color:#2d9e6b;}',
    '.vup-step.done{color:#aaa;}',
    '.vup-dot{width:10px;height:10px;border-radius:50%;background:#333;transition:background 0.3s;}',
    '.vup-step.active .vup-dot{background:#2d9e6b;box-shadow:0 0 0 3px rgba(45,158,107,.25);}',
    '.vup-step.done .vup-dot{background:#555;}',
    '.vup-line{flex:1;height:1px;background:#333;margin-bottom:15px;min-width:24px;}',
    '.vup-line.done{background:#555;}',

    '#vup-file-info{margin-top:6px;font-size:12px;color:#888;}',
  ].join('');

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
      '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d9e6b" stroke-width="2.5">',
      '      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
      '    </svg>',
      '    Đang upload video lên Bunny',
      '  </p>',
      '  <p id="vup-filename">' + esc(filename) + '</p>',
      '  <div id="vup-bar-wrap"><div id="vup-bar"></div></div>',
      '  <div id="vup-meta">',
      '    <span id="vup-label">Khởi tạo...</span>',
      '    <span id="vup-pct">0%</span>',
      '  </div>',
      '  <div id="vup-steps">',
      '    <div class="vup-step active" id="step-init"><div class="vup-dot"></div><span>Khởi tạo</span></div>',
      '    <div class="vup-line" id="line-1"></div>',
      '    <div class="vup-step" id="step-upload"><div class="vup-dot"></div><span>Upload</span></div>',
      '    <div class="vup-line" id="line-2"></div>',
      '    <div class="vup-step" id="step-transcode"><div class="vup-dot"></div><span>Transcode</span></div>',
      '    <div class="vup-line" id="line-3"></div>',
      '    <div class="vup-step" id="step-done"><div class="vup-dot"></div><span>Hoàn tất</span></div>',
      '  </div>',
      '</div>',
    ].join('');
    return div;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ── Step helpers ──────────────────────────────────────────────────────────
  function stepActive(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'vup-step active';
  }
  function stepDone(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'vup-line' === el.className.split(' ')[0].replace('done', '').trim()
      ? 'vup-line done'
      : (el.className.indexOf('vup-line') !== -1 ? 'vup-line done' : 'vup-step done');
  }
  function lineDone(id) {
    var el = document.getElementById(id);
    if (el) el.className = 'vup-line done';
  }

  function setLabel(label, pct) {
    var l = document.getElementById('vup-label');
    var p = document.getElementById('vup-pct');
    if (l) l.textContent = label;
    if (p) p.textContent = pct !== undefined ? pct : '';
  }

  function setBar(pct, cls) {
    var bar = document.getElementById('vup-bar');
    if (!bar) return;
    bar.className = cls || '';
    if (cls !== 'shimmer' && cls !== 'done' && cls !== 'error') {
      bar.style.width = pct + '%';
    }
  }

  // ── Backend API helpers ───────────────────────────────────────────────────
  function apiPost(url, body) {
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrf(),
      },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.detail || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function apiGet(url) {
    return fetch(url, {
      credentials: 'same-origin',
      headers: { 'X-CSRFToken': getCsrf() },
    }).then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.detail || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  // ── TUS upload (chunked PATCH directly to Bunny) ───────────────────────────
  function tusUpload(file, tusEndpoint, tusHeaders, onProgress) {
    return new Promise(function (resolve, reject) {
      var offset = 0;
      var total  = file.size;

      function uploadChunk() {
        if (offset >= total) { resolve(); return; }

        var end   = Math.min(offset + CHUNK_SIZE, total);
        var chunk = file.slice(offset, end);

        var xhr = new XMLHttpRequest();
        xhr.open('PATCH', tusEndpoint, true);
        xhr.setRequestHeader('Tus-Resumable', '1.0.0');
        xhr.setRequestHeader('Upload-Offset', String(offset));
        xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream');
        xhr.setRequestHeader('Content-Length', String(end - offset));
        Object.keys(tusHeaders).forEach(function (k) {
          xhr.setRequestHeader(k, tusHeaders[k]);
        });

        // Track progress for this chunk
        var chunkStart = offset;
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            var sent = chunkStart + e.loaded;
            onProgress(sent, total);
          }
        });

        xhr.addEventListener('load', function () {
          if (xhr.status < 200 || xhr.status > 299) {
            reject(new Error('TUS PATCH failed: HTTP ' + xhr.status));
            return;
          }
          var newOffset = parseInt(xhr.getResponseHeader('Upload-Offset') || end, 10);
          offset = newOffset;
          onProgress(offset, total);
          uploadChunk();
        });

        xhr.addEventListener('error', function () {
          reject(new Error('Mất kết nối trong lúc upload. Vui lòng thử lại.'));
        });

        xhr.send(chunk);
      }

      uploadChunk();
    });
  }

  // ── Poll transcoding status ───────────────────────────────────────────────
  // Bunny status: 0=Created,1=Uploading,2=Processing,3=Transcoding,4=Finished,5=Error
  function pollTranscoding(statusUrl, guid, onProgress) {
    return new Promise(function (resolve, reject) {
      function check() {
        apiGet(statusUrl + '?guid=' + encodeURIComponent(guid))
          .then(function (data) {
            var s  = data.status;
            var ep = data.encode_progress || 0;

            if (s === 4) { onProgress(100); resolve(); return; }
            if (s === 5 || s === 6) { reject(new Error('Bunny transcode thất bại (status=' + s + ').')); return; }

            // status 2 or 3 → actively transcoding
            onProgress(s >= 2 ? ep : 0);
            setTimeout(check, POLL_INTERVAL);
          })
          .catch(reject);
      }
      check();
    });
  }

  // ── Main upload flow ───────────────────────────────────────────────────────
  function runUpload(file, publicId, form) {
    var overlay = createOverlay(file.name);
    document.body.appendChild(overlay);

    var apiBase   = '/api/videos/lessons/' + publicId;
    var initUrl   = apiBase + '/upload/init/';
    var completeUrl = apiBase + '/upload/complete/';
    var statusUrl   = apiBase + '/upload/status/';

    var guid;

    // ── Step 1: Init (create Bunny entry + get TUS auth) ─────────────────
    setLabel('Đang khởi tạo trên Bunny...', '');
    stepActive('step-init');

    apiPost(initUrl, {})
      .then(function (data) {
        guid = data.guid;

        // ── Step 2: Upload to Bunny via TUS ────────────────────────────
        stepDone('step-init');
        lineDone('line-1');
        stepActive('step-upload');
        setLabel('Đang upload lên Bunny...', '0%');
        setBar(0);

        return tusUpload(file, data.tus_endpoint, data.headers, function (sent, total) {
          var pct = Math.round((sent / total) * 100);
          var mb  = (sent / 1024 / 1024).toFixed(1);
          var tot = (total / 1024 / 1024).toFixed(1);
          setLabel('Upload: ' + mb + ' MB / ' + tot + ' MB', pct + '%');
          setBar(pct);
        });
      })

      .then(function () {
        // ── Step 3: Notify backend to save video_id/video_url ──────────
        setBar(100);
        setLabel('Đang lưu thông tin...', '');
        return apiPost(completeUrl, { guid: guid });
      })

      .then(function () {
        // ── Step 4: Poll Bunny transcode status ─────────────────────────
        stepDone('step-upload');
        lineDone('line-2');
        stepActive('step-transcode');
        setBar(0, 'shimmer');
        setLabel('Bunny đang transcode...', '0%');

        return pollTranscoding(statusUrl, guid, function (pct) {
          setLabel('Transcode: ' + pct + '%', pct + '%');
          // Keep shimmer while transcoding; switch to solid when near done
          if (pct >= 100) setBar(100, 'done');
        });
      })

      .then(function () {
        // ── Step 5: Submit Django form (saves other lesson fields) ──────
        stepDone('step-transcode');
        lineDone('line-3');
        stepActive('step-done');
        setBar(100, 'done');
        setLabel('Hoàn tất! Đang lưu bài học...', '✓');

        // Remove file from form so Django doesn't try to re-process it
        var fakeInput = document.createElement('input');
        fakeInput.type = 'hidden';
        fakeInput.name = fileInput.name;
        fileInput.parentNode.insertBefore(fakeInput, fileInput);
        fileInput.disabled = true;

        // Submit the Django admin form normally
        var formData = new FormData(form);
        if (clickedButton && clickedButton.name) {
          formData.set(clickedButton.name, clickedButton.value || '1');
        }
        var xhr = new XMLHttpRequest();
        xhr.open('POST', form.action || window.location.href);
        xhr.withCredentials = true;
        xhr.addEventListener('load', function () {
          setTimeout(function () {
            window.location.href = xhr.responseURL || window.location.href;
          }, 500);
        });
        xhr.send(formData);
      })

      .catch(function (err) {
        setBar(0, 'error');
        setLabel('Lỗi: ' + (err.message || 'Không xác định'), '✗');
        var box = document.getElementById('vup-box');
        if (box) {
          var btn = document.createElement('button');
          btn.textContent = 'Đóng';
          btn.style.cssText = 'margin-top:16px;padding:8px 20px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;';
          btn.onclick = function () { document.body.removeChild(overlay); fileInput.disabled = false; };
          box.appendChild(btn);
        }
      });
  }

  // ── File info helper ──────────────────────────────────────────────────────
  function showFileInfo(file) {
    var info = document.getElementById('vup-file-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'vup-file-info';
      fileInput.parentNode.insertBefore(info, fileInput.nextSibling);
    }
    var mb = (file.size / 1024 / 1024).toFixed(1);
    info.textContent = '🎬 ' + file.name + ' — ' + mb + ' MB';
    info.style.cssText = 'margin-top:6px;font-size:12px;color:#888;';
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    fileInput = document.getElementById('id_video_upload');
    if (!fileInput) return;

    fileInput.addEventListener('change', function () {
      if (this.files[0]) showFileInfo(this.files[0]);
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('input[type=submit], button[type=submit]');
      if (btn) clickedButton = btn;
    });

    var form = fileInput.closest('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      var file = fileInput.files[0];
      if (!file) return; // no video → normal form submit

      var publicId = (document.getElementById('id_lesson_public_id') || {}).value || '';
      if (!publicId) {
        alert('Vui lòng lưu bài học trước khi upload video (cần có lesson ID).');
        e.preventDefault();
        return;
      }

      e.preventDefault();
      runUpload(file, publicId, form);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

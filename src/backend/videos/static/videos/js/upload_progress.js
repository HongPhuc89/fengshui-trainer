/**
 * Django Admin — Video Upload Overlay
 *
 * Khi user chọn file và submit form:
 *  1. Hiện overlay với thanh tiến trình (browser → Django)
 *  2. Form submit bình thường qua XHR (Django sẽ upload lên Bunny)
 *  3. Sau khi xong → redirect về trang change
 */
(function () {
  'use strict';

  var fileInput, clickedButton;

  // ── Styles ────────────────────────────────────────────────────────────────
  var STYLES = [
    '#vup-overlay{position:fixed;inset:0;z-index:99999;',
    'background:rgba(0,0,0,0.7);backdrop-filter:blur(3px);',
    'display:flex;align-items:center;justify-content:center;}',

    '#vup-box{background:#1a1a1a;border:1px solid #333;border-radius:10px;',
    'padding:28px 32px;width:400px;max-width:92vw;font-family:system-ui,sans-serif;}',

    '#vup-title{font-size:15px;font-weight:700;color:#fff;',
    'margin:0 0 5px;display:flex;align-items:center;gap:8px;}',

    '#vup-filename{font-size:12px;color:#888;margin:0 0 18px;',
    'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',

    '#vup-bar-wrap{height:10px;background:#2a2a2a;border-radius:5px;overflow:hidden;margin-bottom:10px;}',

    '#vup-bar{height:100%;border-radius:5px;width:0%;background:#1d6949;transition:width 0.3s ease;}',
    '#vup-bar.shimmer{background:linear-gradient(90deg,#1d6949,#2d9e6b,#1d6949);',
    'background-size:200% 100%;width:100%!important;animation:vup-sh 1.4s infinite;}',
    '#vup-bar.done{background:#2d9e6b;width:100%!important;}',
    '#vup-bar.error{background:#c0392b;width:100%!important;}',

    '@keyframes vup-sh{0%{background-position:200% center}100%{background-position:-200% center}}',

    '#vup-label{font-size:13px;color:#aaa;margin-bottom:6px;}',
    '#vup-note{font-size:11px;color:#555;margin-top:8px;}',

    '#vup-file-info{margin-top:6px;font-size:12px;color:#888;}',
  ].join('');

  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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
      '    Đang upload video',
      '  </p>',
      '  <p id="vup-filename">' + esc(filename) + '</p>',
      '  <div id="vup-bar-wrap"><div id="vup-bar"></div></div>',
      '  <p id="vup-label">Đang gửi file lên server...</p>',
      '  <p id="vup-note">Vui lòng không đóng tab này. File lớn có thể mất vài phút.</p>',
      '</div>',
    ].join('');
    return div;
  }

  function setLabel(text) {
    var el = document.getElementById('vup-label');
    if (el) el.textContent = text;
  }

  function setBar(pct, cls) {
    var bar = document.getElementById('vup-bar');
    if (!bar) return;
    bar.className = cls || '';
    if (!cls) bar.style.width = pct + '%';
  }

  // ── CSRF ──────────────────────────────────────────────────────────────────
  function getCsrf() {
    var match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  // ── Submit form via XHR with upload progress ───────────────────────────────
  function submitWithProgress(form, overlay) {
    var formData = new FormData(form);
    if (clickedButton && clickedButton.name) {
      formData.set(clickedButton.name, clickedButton.value || '1');
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', form.action || window.location.href);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRFToken', getCsrf());

    // Track browser → Django upload progress
    xhr.upload.addEventListener('progress', function (e) {
      if (!e.lengthComputable) return;
      var pct = Math.round((e.loaded / e.total) * 100);
      var mb  = (e.loaded / 1024 / 1024).toFixed(1);
      var tot = (e.total  / 1024 / 1024).toFixed(1);
      setBar(pct);
      setLabel('Đang gửi: ' + mb + ' MB / ' + tot + ' MB (' + pct + '%)');
    });

    xhr.upload.addEventListener('load', function () {
      setBar(100, 'shimmer');
      setLabel('Đang upload lên Bunny CDN, vui lòng đợi...');
    });

    xhr.addEventListener('load', function () {
      setBar(100, 'done');
      setLabel('Hoàn tất! Đang chuyển trang...');
      setTimeout(function () {
        window.location.href = xhr.responseURL || window.location.href;
      }, 400);
    });

    xhr.addEventListener('error', function () {
      setBar(0, 'error');
      setLabel('Lỗi kết nối. Vui lòng thử lại.');
      var box = document.getElementById('vup-box');
      if (box) {
        var btn = document.createElement('button');
        btn.textContent = 'Đóng';
        btn.style.cssText = 'margin-top:16px;padding:8px 20px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:13px;';
        btn.onclick = function () { document.body.removeChild(overlay); };
        box.appendChild(btn);
      }
    });

    xhr.send(formData);
  }

  // ── File info helper ──────────────────────────────────────────────────────
  function showFileInfo(file) {
    var info = document.getElementById('vup-file-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'vup-file-info';
      info.style.cssText = 'margin-top:6px;font-size:12px;color:#888;';
      fileInput.parentNode.insertBefore(info, fileInput.nextSibling);
    }
    var mb = (file.size / 1024 / 1024).toFixed(1);
    info.textContent = file.name + ' — ' + mb + ' MB';
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    var videoInputIds = ['id_video_upload'];
    var watchedInputs = videoInputIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (watchedInputs.length === 0) return;

    watchedInputs.forEach(function (input) {
      input.addEventListener('change', function () {
        if (this.files[0]) showFileInfo(this.files[0]);
      });
    });

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('input[type=submit], button[type=submit]');
      if (btn) clickedButton = btn;
    });

    var form = watchedInputs[0].closest('form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      // Find the first input that has a file selected
      var activeInput = watchedInputs.find(function (inp) { return inp.files[0]; });
      if (!activeInput) return; // no video file → normal form submit

      fileInput = activeInput; // update module-level ref used by showFileInfo
      e.preventDefault();
      var overlay = createOverlay(activeInput.files[0].name);
      document.body.appendChild(overlay);
      submitWithProgress(form, overlay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// ── AJAX button helper (fetch metadata / thumbnail from Bunny) ─────────────
function adminAjaxBtn(btn) {
  var url = btn.getAttribute('data-ajax-url');
  if (!url) return;

  var origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Đang tải...';
  btn.style.opacity = '0.7';

  var csrf = (document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/) || [])[1] || '';

  fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': csrf },
  })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
    .then(function (res) {
      var d = res.data;
      if (d.duration_seconds !== undefined) {
        // Update duration field in the form
        var dur = document.getElementById('id_duration_seconds');
        if (dur) { dur.value = d.duration_seconds; _flashField(dur); }
      }
      if (d.thumbnail_url) {
        // Update thumbnail preview if present
        var preview = document.querySelector('.field-thumbnail img, .field-extract_thumbnail_btn img');
        if (!preview) {
          preview = document.createElement('img');
          preview.style.cssText = 'max-width:200px;border-radius:4px;margin-top:8px;display:block;';
          btn.parentNode.appendChild(preview);
        }
        preview.src = d.thumbnail_url + '?t=' + Date.now();
      }
      _showBtnMsg(btn, d.msg || (res.ok ? 'Thành công' : 'Lỗi'), res.ok ? '#2d9e6b' : '#c0392b');
    })
    .catch(function () {
      _showBtnMsg(btn, 'Lỗi kết nối', '#c0392b');
    })
    .finally(function () {
      btn.disabled = false;
      btn.textContent = origText;
      btn.style.opacity = '';
    });
}

function _flashField(el) {
  el.style.transition = 'background 0.3s';
  el.style.background = '#e8f5e9';
  setTimeout(function () { el.style.background = ''; }, 2000);
}

function _showBtnMsg(btn, text, color) {
  var existing = btn.parentNode.querySelector('.ajax-btn-msg');
  if (existing) existing.remove();
  var span = document.createElement('span');
  span.className = 'ajax-btn-msg';
  span.textContent = ' ' + text;
  span.style.cssText = 'font-size:12px;color:' + color + ';margin-left:8px;';
  btn.parentNode.appendChild(span);
  setTimeout(function () { if (span.parentNode) span.remove(); }, 4000);
}

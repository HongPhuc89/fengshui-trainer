/**
 * Django Admin — VideoCourse auto-slug button
 *
 * Thêm nút "Tạo slug" cạnh field slug trên trang VideoCourse change.
 * Click → lấy giá trị title, chạy qua URLify() (Django built-in), điền vào slug field.
 */
(function () {
  'use strict';

  function init() {
    var slugField = document.getElementById('id_slug');
    var titleField = document.getElementById('id_title');
    if (!slugField || !titleField) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Tạo slug';
    btn.style.cssText = [
      'margin-left:8px',
      'padding:4px 12px',
      'font-size:12px',
      'font-weight:600',
      'background:#417690',
      'color:#fff',
      'border:none',
      'border-radius:4px',
      'cursor:pointer',
      'vertical-align:middle',
    ].join(';');

    btn.addEventListener('mouseenter', function () { this.style.background = '#205067'; });
    btn.addEventListener('mouseleave', function () { this.style.background = '#417690'; });

    btn.addEventListener('click', function () {
      var title = titleField.value.trim();
      if (!title) return;
      // URLify is provided by Django admin (urlify.js loaded globally)
      slugField.value = URLify(title, 255);
      // Trigger change so Django's prepopulate logic doesn't overwrite it
      slugField.dispatchEvent(new Event('change'));
    });

    slugField.parentNode.style.display = 'inline-flex';
    slugField.parentNode.style.alignItems = 'center';
    slugField.parentNode.style.flexWrap = 'wrap';
    slugField.parentNode.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

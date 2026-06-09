<script setup>
defineProps({
  qrImage:      { type: String, default: '' },
  zaloUrl:      { type: String, required: true },
  phone:        { type: String, default: '' },
  messengerUrl: { type: String, default: '' },
})

function hideOnError(e) {
  e.target.style.display = 'none'
}
</script>

<template>
  <aside class="sidebar">
    <!-- Contact box -->
    <div class="sidebar__contact-box">
      <h3 class="sidebar__contact-title">Liên hệ tư vấn &amp; Thỉnh sách</h3>

      <!-- QR with glow -->
      <div v-if="qrImage" class="sidebar__qr-wrapper">
        <div class="sidebar__qr-glow"></div>
        <a :href="zaloUrl" target="_blank" rel="noopener noreferrer" class="sidebar__qr-inner">
          <img :src="qrImage" alt="QR Zalo" class="sidebar__qr-img" @error="hideOnError" />
        </a>
      </div>

      <div class="sidebar__contact-info">
        <p class="sidebar__scan-label">Quét mã Zalo liên hệ</p>
        <a v-if="phone" :href="`tel:${phone}`" class="sidebar__phone">{{ phone }}</a>
      </div>

      <div class="sidebar__divider" aria-hidden="true"></div>

      <div class="sidebar__actions">
        <a
          v-if="messengerUrl"
          :href="messengerUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="sidebar__action-btn"
        >
          <span class="material-symbols-outlined sidebar__action-icon">send</span>
          <span>Messenger</span>
        </a>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* ── Contact box ─────────────────────────────────── */
.sidebar__contact-box {
  background: #1c1b1b;
  border: 1px solid rgba(242, 202, 80, 0.2);
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 0 20px rgba(242, 202, 80, 0.05);
}

.sidebar__contact-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #f2ca50;
  margin-bottom: 1rem;
}

/* QR glow */
.sidebar__qr-wrapper {
  position: relative;
  width: 9rem;
  height: 9rem;
  margin: 0 auto 1rem;
}

.sidebar__qr-glow {
  position: absolute;
  inset: 0;
  background: rgba(242, 202, 80, 0.2);
  filter: blur(2rem);
  border-radius: 9999px;
  transition: background 0.5s;
}

.sidebar__qr-wrapper:hover .sidebar__qr-glow {
  background: rgba(242, 202, 80, 0.3);
}

.sidebar__qr-inner {
  position: relative;
  display: block;
  background: #fff;
  padding: 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(242, 202, 80, 0.3);
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.sidebar__qr-wrapper:hover .sidebar__qr-inner {
  transform: scale(1.05);
}

.sidebar__qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: grayscale(1);
  transition: filter 0.3s;
}

.sidebar__qr-img:hover {
  filter: grayscale(0);
}

/* Contact info */
.sidebar__contact-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 0.25rem;
}

.sidebar__scan-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #f2ca50;
}

.sidebar__phone {
  font-family: 'EB Garamond', serif;
  font-size: 1.4rem;
  font-weight: 500;
  color: #e5e2e1;
  text-decoration: none;
  display: block;
  transition: color 0.2s;
}

.sidebar__phone:hover {
  color: #f2ca50;
}

/* Divider */
.sidebar__divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, #99907c, transparent);
  position: relative;
  margin: 1rem 0;
  opacity: 0.3;
}

.sidebar__divider::after {
  content: '◆';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  background: #1c1b1b;
  padding: 0 0.625rem;
  color: #f2ca50;
  font-size: 0.75rem;
}

/* Action buttons */
.sidebar__actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sidebar__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: #20201f;
  border: 1px solid rgba(242, 202, 80, 0.2);
  color: #e5e2e1;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s;
}

.sidebar__action-btn:hover {
  background: rgba(242, 202, 80, 0.1);
}

.sidebar__action-icon {
  color: #f2ca50;
  font-size: 1.25rem;
  font-variation-settings: 'FILL' 0, 'wght' 300;
}

</style>

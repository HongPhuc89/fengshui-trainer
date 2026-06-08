<script setup>
defineProps({
  qrImage: { type: String, default: '' },
  zaloUrl: { type: String, required: true },
})

function hideOnError(e) {
  e.target.style.display = 'none'
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__contact">
      <a
        v-if="qrImage"
        :href="zaloUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="sidebar__qr-link"
      >
        <img
          :src="qrImage"
          alt="QR Zalo"
          class="sidebar__qr-img"
          @error="hideOnError"
        />
      </a>

      <a
        :href="zaloUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="sidebar__zalo-btn"
      >
        <span class="sidebar__zalo-icon" aria-hidden="true">💬</span>
        Zalo Channel
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 2rem;
}

.sidebar__contact {
  background: var(--bg-card);
  border: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.2);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.sidebar__qr-link {
  display: block;
  width: 180px;
  height: 180px;
}

.sidebar__qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 0.75rem;
  border: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.3);
  background: #fff;
  padding: 0.5rem;
}

.sidebar__zalo-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: var(--bg-main);
  border: 1px solid rgba(var(--color-primary-rgb, 242 202 80), 0.2);
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 0.2s;
}

.sidebar__zalo-btn:hover {
  background: rgba(var(--color-primary-rgb, 242 202 80), 0.1);
}
</style>

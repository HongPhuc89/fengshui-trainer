# Vue.js Web App Architecture

## Document Information
- **Project**: Thiên Thư Web Application
- **Framework**: Vue.js 3 + Vite
- **Version**: 1.0
- **Last Updated**: 2026-02-17

---

## Project Structure

```
src/
├── main.ts
├── App.vue
├── router/
│   └── index.ts
├── stores/
│   ├── auth.ts
│   ├── books.ts
│   ├── videos.ts
│   └── practice.ts
├── api/
│   ├── client.ts
│   ├── endpoints.ts
│   └── interceptors.ts
├── types/
│   ├── user.ts
│   ├── book.ts
│   ├── video.ts
│   └── practice.ts
├── composables/
│   ├── useAuth.ts
│   ├── useDevice.ts
│   └── useWatermark.ts
├── views/
│   ├── auth/
│   ├── books/
│   ├── videos/
│   ├── practice/
│   └── profile/
├── components/
│   ├── common/
│   ├── books/
│   ├── videos/
│   └── practice/
└── assets/
    ├── styles/
    └── images/
```

---

## State Management (Pinia)

### Auth Store

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, LoginCredentials } from '@/types/user';
import { authApi } from '@/api/endpoints';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  
  const isAuthenticated = computed(() => !!user.value);
  const isVIP = computed(() => user.value?.userType === 'VIP');
  
  async function login(credentials: LoginCredentials) {
    try {
      const response = await authApi.login(credentials);
      
      user.value = response.user;
      accessToken.value = response.tokens.access;
      refreshToken.value = response.tokens.refresh;
      
      // Store tokens
      localStorage.setItem('access_token', response.tokens.access);
      localStorage.setItem('refresh_token', response.tokens.refresh);
      
      return response;
    } catch (error) {
      throw error;
    }
  }
  
  async function logout() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
  
  async function loadUser() {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
      const userData = await authApi.getCurrentUser();
      user.value = userData;
    } catch (error) {
      await logout();
    }
  }
  
  return {
    user,
    isAuthenticated,
    isVIP,
    login,
    logout,
    loadUser,
  };
}, {
  persist: true,
});
```

### Books Store

```typescript
// src/stores/books.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Book, BookCategory } from '@/types/book';
import { booksApi } from '@/api/endpoints';

export const useBooksStore = defineStore('books', () => {
  const books = ref<Book[]>([]);
  const categories = ref<BookCategory[]>([]);
  const currentBook = ref<Book | null>(null);
  const loading = ref(false);
  
  async function fetchBooks(categorySlug?: string) {
    loading.value = true;
    try {
      books.value = await booksApi.getBooks({ category: categorySlug });
    } finally {
      loading.value = false;
    }
  }
  
  async function fetchBookDetail(slug: string) {
    loading.value = true;
    try {
      currentBook.value = await booksApi.getBookDetail(slug);
      return currentBook.value;
    } finally {
      loading.value = false;
    }
  }
  
  async function fetchCategories() {
    categories.value = await booksApi.getCategories();
  }
  
  return {
    books,
    categories,
    currentBook,
    loading,
    fetchBooks,
    fetchBookDetail,
    fetchCategories,
  };
});
```

---

## API Client

```typescript
// src/api/client.ts
import axios, { type AxiosInstance } from 'axios';
import { authInterceptor, errorInterceptor } from './interceptors';

class ApiClient {
  private client: AxiosInstance;
  
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.client.interceptors.request.use(authInterceptor);
    this.client.interceptors.response.use(
      (response) => response,
      errorInterceptor
    );
  }
  
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }
  
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }
  
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }
  
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

### Interceptors

```typescript
// src/api/interceptors.ts
import type { InternalAxiosRequestConfig, AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth';

export function authInterceptor(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('access_token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}

export async function errorInterceptor(error: AxiosError) {
  if (error.response?.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        const response = await axios.post('/api/auth/refresh/', {
          refresh: refreshToken,
        });
        
        localStorage.setItem('access_token', response.data.access);
        
        // Retry original request
        if (error.config) {
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return axios(error.config);
        }
      } catch (refreshError) {
        // Refresh failed, logout
        const authStore = useAuthStore();
        await authStore.logout();
        window.location.href = '/login';
      }
    }
  }
  
  return Promise.reject(error);
}
```

---

## Router Configuration

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
    },
    {
      path: '/books',
      name: 'books',
      component: () => import('@/views/books/BooksListView.vue'),
    },
    {
      path: '/books/:slug',
      name: 'book-detail',
      component: () => import('@/views/books/BookDetailView.vue'),
    },
    {
      path: '/books/:slug/read/:chapter',
      name: 'book-reader',
      component: () => import('@/views/books/BookReaderView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/videos',
      name: 'videos',
      component: () => import('@/views/videos/VideosListView.vue'),
    },
    {
      path: '/videos/:slug',
      name: 'video-player',
      component: () => import('@/views/videos/VideoPlayerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('@/views/practice/PracticeView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;
```

---

## Views

### Book Reader View

```vue
<!-- src/views/books/BookReaderView.vue -->
<template>
  <div class="book-reader">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
    </div>
    
    <div v-else-if="chapter" class="reader-content">
      <div class="chapter-header">
        <h1>{{ chapter.title }}</h1>
      </div>
      
      <div class="chapter-body" v-html="chapter.content"></div>
      
      <!-- Watermark -->
      <Watermark v-if="chapter.watermark" :config="chapter.watermark" />
    </div>
    
    <div v-else class="error">
      <p>Không thể tải nội dung</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { booksApi } from '@/api/endpoints';
import Watermark from '@/components/common/Watermark.vue';
import type { BookChapter } from '@/types/book';

const route = useRoute();
const chapter = ref<BookChapter | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const slug = route.params.slug as string;
    const chapterOrder = parseInt(route.params.chapter as string);
    
    chapter.value = await booksApi.getChapter(slug, chapterOrder);
  } catch (error) {
    console.error('Failed to load chapter:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.book-reader {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

.chapter-body {
  line-height: 1.8;
  font-size: 1.1rem;
}
</style>
```

### Video Player View

```vue
<!-- src/views/videos/VideoPlayerView.vue -->
<template>
  <div class="video-player-page">
    <div v-if="loading" class="loading">
      <v-progress-circular indeterminate />
    </div>
    
    <div v-else-if="video" class="player-container">
      <video
        ref="videoElement"
        :src="video.videoUrl"
        controls
        @timeupdate="handleProgress"
        class="video-element"
      />
      
      <!-- Video Watermark -->
      <VideoWatermark v-if="video.watermark" :config="video.watermark" />
      
      <div class="video-info">
        <h1>{{ video.title }}</h1>
        <p>{{ video.description }}</p>
        
        <!-- Tabs -->
        <v-tabs v-model="activeTab">
          <v-tab value="transcript">Transcript</v-tab>
          <v-tab value="summary">Tóm tắt</v-tab>
          <v-tab value="quiz">Quiz</v-tab>
        </v-tabs>
        
        <v-window v-model="activeTab">
          <v-window-item value="transcript">
            <div class="transcript">{{ video.transcript }}</div>
          </v-window-item>
          
          <v-window-item value="summary">
            <div class="summary">{{ video.summary }}</div>
          </v-window-item>
          
          <v-window-item value="quiz">
            <QuizSection :quizzes="video.quizzes" />
          </v-window-item>
        </v-window>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { videosApi } from '@/api/endpoints';
import VideoWatermark from '@/components/videos/VideoWatermark.vue';
import QuizSection from '@/components/videos/QuizSection.vue';
import type { Video } from '@/types/video';

const route = useRoute();
const video = ref<Video | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const activeTab = ref('transcript');

let progressInterval: number;

onMounted(async () => {
  try {
    const slug = route.params.slug as string;
    video.value = await videosApi.getVideoDetail(slug);
    
    // Start progress tracking
    progressInterval = setInterval(saveProgress, 10000);
  } catch (error) {
    console.error('Failed to load video:', error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  clearInterval(progressInterval);
  saveProgress();
});

function handleProgress() {
  // Progress is saved periodically
}

async function saveProgress() {
  if (!videoElement.value || !video.value) return;
  
  const progressSeconds = Math.floor(videoElement.value.currentTime);
  await videosApi.updateProgress(video.value.slug, progressSeconds);
}
</script>
```

---

## Components

### Watermark Component

```vue
<!-- src/components/common/Watermark.vue -->
<template>
  <div
    class="watermark"
    :style="watermarkStyle"
  >
    {{ config.text }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WatermarkConfig } from '@/types/common';

const props = defineProps<{
  config: WatermarkConfig;
}>();

const watermarkStyle = computed(() => ({
  position: 'fixed',
  [props.config.position.includes('top') ? 'top' : 'bottom']: '20px',
  [props.config.position.includes('left') ? 'left' : 'right']: '20px',
  opacity: props.config.opacity,
  transform: `rotate(${props.config.rotation}deg)`,
  fontSize: `${props.config.fontSize}px`,
  color: props.config.color,
  pointerEvents: 'none',
  userSelect: 'none',
  textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
  zIndex: 9999,
}));
</script>
```

---

## Composables

### useDevice

```typescript
// src/composables/useDevice.ts
import { ref } from 'vue';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import UAParser from 'ua-parser-js';

export function useDevice() {
  const deviceId = ref<string>('');
  const deviceName = ref<string>('');
  
  async function getDeviceId() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    deviceId.value = result.visitorId;
    return deviceId.value;
  }
  
  function getDeviceName() {
    const parser = new UAParser();
    const result = parser.getResult();
    deviceName.value = `${result.browser.name} on ${result.os.name}`;
    return deviceName.value;
  }
  
  return {
    deviceId,
    deviceName,
    getDeviceId,
    getDeviceName,
  };
}
```

---

## Environment Configuration

```env
# .env.development
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Thiên Thư

# .env.production
VITE_API_BASE_URL=https://api.fengshui-trainer.com/api
VITE_APP_NAME=Thiên Thư
```

---

## Dependencies

```json
{
  "name": "fengshui-trainer-web",
  "version": "1.0.0",
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "pinia-plugin-persistedstate": "^3.2.0",
    "axios": "^1.6.0",
    "vuetify": "^3.5.0",
    "@fingerprintjs/fingerprintjs": "^4.2.0",
    "ua-parser-js": "^1.0.0",
    "video.js": "^8.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.2.0",
    "@vue/test-utils": "^2.4.0"
  }
}
```

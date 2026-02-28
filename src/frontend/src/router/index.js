import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: () => import('../views/HomeView.vue') },
      { path: 'profile', name: 'Profile', component: () => import('../views/ProfileView.vue') },
      { path: 'books', name: 'Books', component: () => import('../views/BooksView.vue') },
      { path: 'store', name: 'Store', component: () => import('../views/StoreView.vue') },
      { path: 'videos', name: 'Videos', component: () => import('../views/VideosView.vue') },
      { path: 'videos/:slug', name: 'VideoDetail', component: () => import('../views/VideoDetailView.vue') },
    ],
  },
  {
    path: '/videos/:slug/lessons/:lessonSlug',
    name: 'VideoPlayer',
    component: () => import('../views/VideoPlayerView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/books/:slug/read',
    name: 'BookReader',
    component: () => import('../views/BookReaderView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/training/lesson/:lessonSlug',
    name: 'TrainingLesson',
    component: () => import('../views/TrainingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/training/module/:moduleSlug',
    name: 'TrainingModule',
    component: () => import('../views/TrainingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/auth',
    component: AuthLayout,
    meta: { guest: true },
    children: [
      { path: 'login', name: 'Login', component: () => import('../views/LoginView.vue') },
      { path: 'register', name: 'Register', component: () => import('../views/RegisterView.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }
  if (to.meta.guest && auth.isAuthenticated) {
    next({ name: 'Home' })
    return
  }
  next()
})

export default router

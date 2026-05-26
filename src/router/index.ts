import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/oauth/callback',
    name: 'OAuthCallback',
    component: () => import('@/views/OAuthCallback.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/pipelines',
    name: 'Pipelines',
    component: () => import('@/views/Pipelines.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':projectId/:pipelineId',
        name: 'PipelineDetail',
        component: () => import('@/components/detail/PipelineDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/jobs',
    name: 'Jobs',
    component: () => import('@/views/Jobs.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':projectId/:jobId',
        name: 'JobDetail',
        component: () => import('@/components/detail/JobDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/runners',
    name: 'Runners',
    component: () => import('@/views/Runners.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':runnerId',
        name: 'RunnerDetail',
        component: () => import('@/components/detail/RunnerDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/projects',
    name: 'Projects',
    component: () => import('@/views/Projects.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':projectId',
        name: 'ProjectDetail',
        component: () => import('@/components/detail/ProjectDetailPanel.vue'),
      },
      {
        path: ':projectId/commits/:sha',
        name: 'ProjectCommitDetail',
        component: () => import('@/components/detail/CommitDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/commits',
    name: 'Commits',
    component: () => import('@/views/Commits.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':projectId/:sha',
        name: 'CommitDetail',
        component: () => import('@/components/detail/CommitDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/merge-requests',
    name: 'MergeRequests',
    component: () => import('@/views/MergeRequests.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dora',
    name: 'Dora',
    component: () => import('@/views/Dora.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/graphql',
    name: 'GraphqlAnalytics',
    component: () => import('@/views/GraphqlAnalytics.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/Users.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: ':userId',
        name: 'UserDetail',
        component: () => import('@/components/detail/UserDetailPanel.vue'),
      },
    ],
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/Settings.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    authStore.initFromEnv()
  }

  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'Login' })
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router

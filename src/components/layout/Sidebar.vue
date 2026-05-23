<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  GitBranch,
  Play,
  Server,
  GitCommit,
  FolderGit2,
  Users,
  Settings,
  GitlabIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useMetricsStore } from '@/stores/metrics'

interface Props {
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  collapsed: false,
})

const emit = defineEmits<{
  'update:collapsed': [value: boolean]
}>()

const route = useRoute()
const authStore = useAuthStore()
const metricsStore = useMetricsStore()

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/projects', icon: FolderGit2, label: 'Projetos' },
  { path: '/pipelines', icon: GitBranch, label: 'Pipelines' },
  { path: '/jobs', icon: Play, label: 'Jobs' },
  { path: '/runners', icon: Server, label: 'Runners' },
  { path: '/commits', icon: GitCommit, label: 'Commits' },
  { path: '/users', icon: Users, label: 'Usuários' },
  { path: '/settings', icon: Settings, label: 'Configurações' },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const toggleCollapse = () => {
  emit('update:collapsed', !props.collapsed)
}

const groupName = computed(() => metricsStore.group?.name || 'GitLab Metrics')
</script>

<template>
  <aside
    :class="[
      'flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <!-- Logo -->
    <div class="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
        <GitlabIcon class="h-5 w-5 text-sidebar-primary-foreground" />
      </div>
      <div v-if="!collapsed" class="flex-1 overflow-hidden">
        <h1 class="truncate text-sm font-semibold text-sidebar-foreground">
          {{ groupName }}
        </h1>
        <p class="text-xs text-muted-foreground">Metrics Dashboard</p>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto p-2">
      <ul class="space-y-1">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink
            :to="item.path"
            :class="[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              isActive(item.path)
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5 flex-shrink-0" />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- User Section -->
    <div class="border-t border-sidebar-border p-3">
      <div v-if="authStore.isAuthenticated" class="flex items-center gap-3">
        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
          <img
            v-if="authStore.user?.avatar_url"
            :src="authStore.user.avatar_url"
            :alt="authStore.displayName"
            class="h-9 w-9 rounded-full"
          />
          <span v-else class="text-sm font-medium text-sidebar-foreground">
            {{ authStore.displayName.charAt(0).toUpperCase() }}
          </span>
        </div>
        <div v-if="!collapsed" class="flex-1 overflow-hidden">
          <p class="truncate text-sm font-medium text-sidebar-foreground">
            {{ authStore.displayName }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ authStore.authMethod === 'pat' ? 'Token' : 'OAuth' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Collapse Toggle -->
    <button
      class="flex h-10 items-center justify-center border-t border-sidebar-border text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
      @click="toggleCollapse"
    >
      <ChevronLeft v-if="!collapsed" class="h-5 w-5" />
      <ChevronRight v-else class="h-5 w-5" />
    </button>
  </aside>
</template>

<template>
  <div class="layout-container">
    <el-container>
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
        <div class="logo">
          <span v-show="!isCollapse">🛠️ Web Tools</span>
          <span v-show="isCollapse">🔧</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :unique-opened="true"
          router
          background-color="#ffffff"
          text-color="#606266"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>
          <el-menu-item index="/diff">
            <el-icon><Files /></el-icon>
            <template #title>Diff 工具</template>
          </el-menu-item>
          <el-menu-item index="/formatter">
            <el-icon><Document /></el-icon>
            <template #title>代码格式化</template>
          </el-menu-item>
          <el-menu-item index="/hash">
            <el-icon><Key /></el-icon>
            <template #title>Hash 计算</template>
          </el-menu-item>
          <el-menu-item index="/gobang">
            <el-icon><Grid /></el-icon>
            <template #title>五子棋</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header class="header">
          <el-button @click="toggleCollapse" :icon="isCollapse ? 'Expand' : 'Fold'" circle />
          <span class="header-title">{{ currentTitle }}</span>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isCollapse = ref(false)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  const routeMap = {
    '/': '首页',
    '/diff': 'Diff 工具',
    '/formatter': '代码格式化',
    '/hash': 'Hash 计算',
    '/gobang': '五子棋'
  }
  return routeMap[route.path] || 'Web Tools'
})
</script>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.sidebar {
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

.el-menu {
  border-right: none;
  background: #ffffff;
}

:deep(.el-menu-item) {
  color: #606266;
}

:deep(.el-menu-item:hover) {
  background: #ecf5ff !important;
  color: #409eff !important;
}

:deep(.el-menu-item.is-active) {
  background: #ecf5ff !important;
  color: #409eff !important;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  margin-left: 15px;
  color: #303133;
}

.main-content {
  background: #f8f9fa;
  padding: 0;
  overflow: hidden;
}
</style>

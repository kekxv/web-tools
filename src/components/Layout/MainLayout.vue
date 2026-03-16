<template>
  <div class="layout-container">
    <!-- 移动端侧边栏 -->
    <div v-if="isMobile" class="mobile-sidebar-wrapper" :class="{ 'sidebar-open': !isCollapse }">
      <el-aside class="mobile-sidebar">
        <div class="logo">
          <span>🛠️ Web Tools</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#ffffff"
          text-color="#606266"
          active-text-color="#409eff"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <template #title>首页</template>
          </el-menu-item>
          <el-sub-menu index="games">
            <template #title>
              <el-icon><Van /></el-icon>
              <span>休闲一下</span>
            </template>
            <el-menu-item index="/gobang">
              <el-icon><Grid /></el-icon>
              <span>五子棋</span>
            </el-menu-item>
            <el-menu-item index="/game24">
              <el-icon><Odometer /></el-icon>
              <span>24 点</span>
            </el-menu-item>
            <el-menu-item index="/showhand">
              <el-icon><Van /></el-icon>
              <span>梭哈</span>
            </el-menu-item>
            <el-menu-item index="/mahjong">
              <el-icon><Grid /></el-icon>
              <span>广东麻将</span>
            </el-menu-item>
            <el-menu-item index="/math-ten">
              <el-icon><Odometer /></el-icon>
              <span>凑十破十</span>
            </el-menu-item>
            <el-menu-item index="/multiplication">
              <el-icon><Coin /></el-icon>
              <span>小小乘法表</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/diff">
            <el-icon><Files /></el-icon>
            <template #title>Diff 工具</template>
          </el-menu-item>
          <el-menu-item index="/formatter">
            <el-icon><Document /></el-icon>
            <template #title>代码格式化</template>
          </el-menu-item>
          <el-menu-item index="/json-compare">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>JSON/XML 对比</template>
          </el-menu-item>
          <el-menu-item index="/base64">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>Base64 查看</template>
          </el-menu-item>
          <el-menu-item index="/hash">
            <el-icon><Key /></el-icon>
            <template #title>Hash 计算</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <!-- 遮罩层 -->
      <div class="overlay" @click="toggleCollapse"></div>
    </div>

    <!-- 主内容区（移动端和桌面端共用） -->
    <el-container class="main-container">
      <!-- 桌面端侧边栏 -->
      <el-aside v-if="!isMobile" :width="isCollapse ? '64px' : '220px'" class="sidebar">
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
            <el-icon><House /></el-icon>
            <template #title>首页</template>
          </el-menu-item>
          <el-sub-menu index="games">
            <template #title>
              <el-icon><Van /></el-icon>
              <span>休闲一下</span>
            </template>
            <el-menu-item index="/gobang">
              <el-icon><Grid /></el-icon>
              <span>五子棋</span>
            </el-menu-item>
            <el-menu-item index="/game24">
              <el-icon><Odometer /></el-icon>
              <span>24 点</span>
            </el-menu-item>
            <el-menu-item index="/showhand">
              <el-icon><Van /></el-icon>
              <span>梭哈</span>
            </el-menu-item>
            <el-menu-item index="/mahjong">
              <el-icon><Grid /></el-icon>
              <span>广东麻将</span>
            </el-menu-item>
            <el-menu-item index="/math-ten">
              <el-icon><Odometer /></el-icon>
              <span>凑十破十</span>
            </el-menu-item>
            <el-menu-item index="/multiplication">
              <el-icon><Coin /></el-icon>
              <span>小小乘法表</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/diff">
            <el-icon><Files /></el-icon>
            <template #title>Diff 工具</template>
          </el-menu-item>
          <el-menu-item index="/formatter">
            <el-icon><Document /></el-icon>
            <template #title>代码格式化</template>
          </el-menu-item>
          <el-menu-item index="/json-compare">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>JSON/XML 对比</template>
          </el-menu-item>
          <el-menu-item index="/base64">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>Base64 查看</template>
          </el-menu-item>
          <el-menu-item index="/hash">
            <el-icon><Key /></el-icon>
            <template #title>Hash 计算</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <!-- 桌面端折叠按钮 -->
            <el-button class="desktop-fold-btn" @click="toggleCollapse" :icon="isCollapse ? 'Expand' : 'Fold'" circle />
            <!-- 移动端菜单按钮 -->
            <el-button class="mobile-menu-btn" @click="toggleCollapse" :icon="'Menu'" circle />
            <span class="header-title">{{ currentTitle }}</span>
          </div>
        </el-header>
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { House, Files, Document, DataAnalysis, Key, Grid, Odometer, Van, Coin } from '@element-plus/icons-vue'

const route = useRoute()
const isCollapse = ref(false)
const isMobile = ref(false)

// 检测是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  // 移动端默认折叠
  if (isMobile.value) {
    isCollapse.value = true
  }
}

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const handleToggleSidebar = () => {
  toggleCollapse()
}

// 移动端点击菜单项后自动收起
const handleMenuSelect = () => {
  if (isMobile.value) {
    isCollapse.value = true
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  // 监听子组件的菜单切换事件
  window.addEventListener('toggle-sidebar', handleToggleSidebar)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('toggle-sidebar', handleToggleSidebar)
})

const activeMenu = computed(() => route.path)

const currentTitle = computed(() => {
  const routeMap = {
    '/': '首页',
    '/diff': 'Diff 工具',
    '/formatter': '代码格式化',
    '/json-compare': 'JSON/XML 对比',
    '/base64': 'Base64 查看',
    '/hash': 'Hash 计算',
    '/gobang': '五子棋',
    '/game24': '24 点',
    '/showhand': '梭哈',
    '/mahjong': '广东麻将',
    '/math-ten': '凑十破十',
    '/multiplication': '小小乘法表'
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

.main-container {
  height: 100%;
  width: 100%;
}

/* ========== 桌面端侧边栏 ========== */
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
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 移动端菜单按钮 - 默认隐藏 */
.mobile-menu-btn {
  display: none;
}

/* 桌面端折叠按钮 */
.desktop-fold-btn {
  display: inline-flex;
}

.main-content {
  background: #f8f9fa;
  padding: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ========== 移动端侧边栏 ========== */
.mobile-sidebar-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 220px;
  z-index: 1000;
  transition: transform 0.3s ease-in-out;
  transform: translateX(-100%);
}

.mobile-sidebar-wrapper.sidebar-open {
  transform: translateX(0);
}

.mobile-sidebar {
  width: 220px !important;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  height: 100%;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
}

.mobile-sidebar .logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #e4e7ed;
}

.mobile-sidebar .el-menu {
  border-right: none;
  background: #ffffff;
}

:deep(.mobile-sidebar .el-menu-item) {
  color: #606266;
}

:deep(.mobile-sidebar .el-menu-item:hover) {
  background: #ecf5ff !important;
  color: #409eff !important;
}

:deep(.mobile-sidebar .el-menu-item.is-active) {
  background: #ecf5ff !important;
  color: #409eff !important;
}

/* 遮罩层 - 在侧边栏内部，不需要 z-index */
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: -1;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .header {
    padding: 0 15px;
  }

  .header-title {
    font-size: 16px;
  }

  /* 隐藏桌面端折叠按钮 */
  .desktop-fold-btn {
    display: none !important;
  }

  /* 显示移动端菜单按钮 */
  .mobile-menu-btn {
    display: inline-flex !important;
  }

  /* 移动端主内容区占满全宽 */
  .main-container {
    width: 100%;
  }

  /* 移动端主内容区可滚动 */
  .main-content {
    height: calc(100vh - 60px);
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>

import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../components/Layout/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('../views/Home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'diff',
        name: 'Diff',
        component: () => import('../views/DiffView.vue'),
        meta: { title: 'Diff 工具' }
      },
      {
        path: 'formatter',
        name: 'Formatter',
        component: () => import('../views/FormatterView.vue'),
        meta: { title: '代码格式化' }
      },
      {
        path: 'json-compare',
        name: 'JsonCompare',
        component: () => import('../views/JsonCompareView.vue'),
        meta: { title: 'JSON/XML 对比' }
      },
      {
        path: 'hash',
        name: 'Hash',
        component: () => import('../views/HashView.vue'),
        meta: { title: 'Hash 计算' }
      },
      {
        path: 'totp',
        name: 'Totp',
        component: () => import('../views/TotpView.vue'),
        meta: { title: 'TOTP 验证码' }
      },
      {
        path: 'gobang',
        name: 'Gobang',
        component: () => import('../views/GobangView.vue'),
        meta: { title: '五子棋' }
      },
      {
        path: 'game24',
        name: 'Game24',
        component: () => import('../views/Game24View.vue'),
        meta: { title: '24 点' }
      },
      {
        path: 'showhand',
        name: 'ShowHand',
        component: () => import('../views/ShowHandView.vue'),
        meta: { title: '梭哈' }
      },
      {
        path: 'mahjong',
        name: 'Mahjong',
        component: () => import('../views/MahjongView.vue'),
        meta: { title: '广东麻将' }
      },
      {
        path: 'base64',
        name: 'Base64',
        component: () => import('../views/Base64View.vue'),
        meta: { title: 'Base64 查看' }
      },
      {
        path: 'math-ten',
        name: 'MathTen',
        component: () => import('../views/MathTenView.vue'),
        meta: { title: '凑十破十' }
      },
      {
        path: 'multiplication',
        name: 'Multiplication',
        component: () => import('../views/MultiplicationView.vue'),
        meta: { title: '小小乘法表' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router
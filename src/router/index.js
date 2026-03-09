import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/Layout/MainLayout.vue'
import Home from '../views/Home.vue'
import DiffView from '../views/DiffView.vue'
import FormatterView from '../views/FormatterView.vue'
import HashView from '../views/HashView.vue'
import GobangView from '../views/GobangView.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: Home,
        meta: { title: '首页' }
      }
    ]
  },
  {
    path: '/diff',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Diff',
        component: DiffView,
        meta: { title: 'Diff 工具' }
      }
    ]
  },
  {
    path: '/formatter',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Formatter',
        component: FormatterView,
        meta: { title: '代码格式化' }
      }
    ]
  },
  {
    path: '/hash',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Hash',
        component: HashView,
        meta: { title: 'Hash 计算' }
      }
    ]
  },
  {
    path: '/gobang',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Gobang',
        component: GobangView,
        meta: { title: '五子棋' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

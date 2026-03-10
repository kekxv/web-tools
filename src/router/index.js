import { createRouter, createWebHashHistory } from 'vue-router'
import MainLayout from '../components/Layout/MainLayout.vue'
import Home from '../views/Home.vue'
import DiffView from '../views/DiffView.vue'
import FormatterView from '../views/FormatterView.vue'
import HashView from '../views/HashView.vue'
import GobangView from '../views/GobangView.vue'
import Game24View from '../views/Game24View.vue'
import ShowHandView from '../views/ShowHandView.vue'

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
      },
      {
        path: 'diff',
        name: 'Diff',
        component: DiffView,
        meta: { title: 'Diff 工具' }
      },
      {
        path: 'formatter',
        name: 'Formatter',
        component: FormatterView,
        meta: { title: '代码格式化' }
      },
      {
        path: 'hash',
        name: 'Hash',
        component: HashView,
        meta: { title: 'Hash 计算' }
      },
      {
        path: 'gobang',
        name: 'Gobang',
        component: GobangView,
        meta: { title: '五子棋' }
      },
      {
        path: 'game24',
        name: 'Game24',
        component: Game24View,
        meta: { title: '24 点' }
      },
      {
        path: 'showhand',
        name: 'ShowHand',
        component: ShowHandView,
        meta: { title: '梭哈' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

export default router

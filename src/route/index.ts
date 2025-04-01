import {createRouter, createWebHistory} from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'manageGoods',
        component: () => import('@/pages/admin/manageGoods.vue')
    },
    {
        path: '/goodsList',
        name: 'goodsList',
        component: () => import('@/pages/admin/goodsList.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router;
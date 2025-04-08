import { createApp } from 'vue'
import App from './App.vue'
import router from '@/route/index'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/index.less'

createApp(App).use(router).use(ElementPlus).mount('#app')

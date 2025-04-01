import { createApp } from 'vue'
import App from './App.vue'
import "./styles/index.less"
import router from '@/route/index'

createApp(App)
    .use(router)
    .mount('#app')
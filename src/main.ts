import { createApp } from 'vue'
import App from './App.vue'
import router from '@/route/index'
import "./styles/index.less"

createApp(App)
    .use(router)
    .mount('#app')
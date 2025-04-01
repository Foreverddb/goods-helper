import Koa from 'koa';
import router from '@/route/index'
import mountTool from '@/middleware/mount-tool';

const app = new Koa()

app.use(mountTool()); // 挂载工具到 ctx
app.use(router.routes())


export default app
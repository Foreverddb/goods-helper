import Router from 'koa-router';
import Test from '@/services/test'

const router = new Router();

router.get("/test", Test.testKoa)

export default router;
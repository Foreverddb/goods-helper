/* eslint-disable import/first */
import alias from 'module-alias';
import * as path from 'path';

import app from "../app"

// 根据__dirname动态调整入口文件目录,让TS模块别名在运行时生效
alias(path.resolve(__dirname, '..'));

const server = app.listen(3000, () => {
console.log(`The Server is started at : http://127.0.0.1:3000, RUN_ENV, ${process.env.RUN_ENV}`);
});

server.keepAliveTimeout = 60 * 1000; // 解决长连接的关闭的问题： https://zhuanlan.zhihu.com/p/88356559
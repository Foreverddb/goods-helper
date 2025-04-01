import type { Context } from 'koa';

export default {
    async testKoa(ctx: Context) {
      console.log("this is a test")
      return ctx.success({msg: "success"})
    }

}
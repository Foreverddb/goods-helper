import { Context, Next } from "koa";

export default function mountTool() {
    return async (ctx: Context, next: Next) => {
        // todo ErrCodeEnumValues, ERROR_MESSAGE
        ctx.fail = (code: number, msg?: string) => {
            ctx.body = {
                return_code: code,
                return_msg: msg || "Request Error",
                //   return_msg: msg ? `${ERROR_MESSAGE[code]}: ${msg}` : ERROR_MESSAGE[code],
                data: {},
            };
        };
      
        ctx.success = (data: object) => {
        ctx.body = {
                return_code: 0,
                return_msg: 'ok',
                data,
            };
        };
      
        await next();
    }
}
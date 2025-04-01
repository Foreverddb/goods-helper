import 'koa';

declare module 'koa' {
    interface Response {
      body: any;
    }
  
    interface BaseContext {
      /**
       * Response JSON format
       * @param data Response Data
       */
      success(this: Context, data: object): void;
      /**
       * Response Error JSON format
       * @param code Response code
       * @param msg Response message
       */
      fail(this: Context, code: number, msg?: string): void;
    }
  }
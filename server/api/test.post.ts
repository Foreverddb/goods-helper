// server/api/test.post.ts
export default defineEventHandler(async (event) => {
    // 获取请求体数据
    const body = await readBody(event)
    
    return {
      message: 'success',
      receivedData: body
    }
  })
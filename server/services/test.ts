import type { Context } from 'koa'

export default {
  async testKoa(ctx: Context) {
    console.log('this is a test')
    return ctx.success({ msg: 'success' })
  },

  async testActivityMock(ctx: Context) {
    const mockData = [
      {
        activityName: 'yukkisu 的测试用例-1',
        activityId: 1,
        beginTime: new Date().toLocaleString(),
        endTime: new Date().toLocaleString()
      },
      {
        activityName: 'yukkisu 的测试用例-2',
        activityId: 2,
        beginTime: new Date().toLocaleString(),
        endTime: new Date().toLocaleString()
      },
      {
        activityName: 'yukkisu 的测试用例-3',
        activityId: 3,
        beginTime: new Date().toLocaleString(),
        endTime: new Date().toLocaleString()
      },
      {
        activityName: 'yukkisu 的测试用例-4',
        activityId: 4,
        beginTime: new Date().toLocaleString(),
        endTime: new Date().toLocaleString()
      }
    ]

    return ctx.success({
      data: mockData
    })
  }
}

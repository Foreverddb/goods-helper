# 后端接口设计

## 用户侧

### 登陆/注册/找回密码/邮箱验证码

`/user/login` ：用户登陆以及鉴权

`/user/register：`用户注册以及鉴权

### 用户主页信息

`/user/query-detail`：查询用户主页信息

`/user/query-goods-homework` ：查询已下单的谷子

### 用户拼谷

`/user/query-goods-activity` ：查询当前已排期的拼谷活动

`/user/query-goods-list`：查询当前活动排期的谷子

`/user/submit-goods` ：提交拼谷信息

`/user/submit-homework` ：交作业

## 管理侧

`/admin/audit` ：管理员鉴权

`/admin/submit-goods-info` ：上传本次拼谷信息

`/admin/edit-goods-info` ：编辑本次拼谷信息

`/admin/query-goods-activity`：查询当前已排期的拼谷活动（包括作业提交情况）

`/admin/query-goods-list`：查询当前活动排期的谷子（包括作业提交情况）

`/admin/edit-goods-list`：编辑当前活动的拼谷信息（包括作业提交情况）

`/admin/send-expedite-email` ：发送催交邮件

# 后端数据库设计

> PS 这里所有的谷子列表均为数组，存储时使用`JSON.stringify`序列化后存储

## 用户 / 管理员表

- `username` ：用户名（必填）
- `passward` ：密码（哈希存储，必填）
- `role` ：user / admin（必填，默认 user）
- `email` ：邮箱（必填）
- `qq` ：QQ 号（必填）
- `vx` ：微信（选填）

## 拼谷活动

- `activityName` ：拼谷活动名称
- `activityId` ：拼谷活动 ID（提交时生成）
- `beginTime` ：开始时间
- `endTime`：结束时间

## 拼谷信息

- `activityName` ：拼谷活动名称
- `activityId` ：拼谷活动 ID（提交时生成）
- `goodsList` ：谷子列表
- `createTime` ：创建时间
- `beginTime` ：开始时间
- `endTime`：结束时间
- `editTime`：编辑时间

## 谷子信息

- `goodsName`：谷子名称
- `goodsPrice` ：谷子价格
- `goodsCount` ：谷子余量
- `goodsTotal` ：谷子总量

## 提交拼谷-用户侧

- `activityName` ：拼谷活动名称
- `activityId` ：拼谷活动 ID（提交时生成）
- `goodsList` ：提交的谷子列表

## 编辑拼谷-管理侧

- `activityName` ：拼谷活动名称
- `activityId` ：拼谷活动 ID（提交时生成）
- `goodsList` ：谷子列表

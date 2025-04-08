import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import camelcaseKeys from 'camelcase-keys'

interface YukkiResponseBody<T> {
  returnCode: number
  returnMsg: string
  data: T
}

const HTTP_STATUS_OK = 200
const AXIOS_COMMON_CONFIG: Partial<AxiosRequestConfig> = {
  validateStatus: statusCode => statusCode === HTTP_STATUS_OK,
  timeout: 60000
}

/** 会话过期错误码 */
export const SESSION_EXPIRED_CODE = 268492502
/** 会话不存在错误码 */
export const SESSION_NOT_EXIST_CODE = 268492501

export const ErrorCodeMsgMap = {
  [SESSION_EXPIRED_CODE]: 'Login status expired, please log in again.',
  [SESSION_NOT_EXIST_CODE]: 'Session is not existed, please log in again.'
}

function yukkiResponseHandler<T>(response: AxiosResponse) {
  const body: YukkiResponseBody<T> = camelcaseKeys(response.data, { deep: true })
  const { returnCode } = body
  const errorMessage = Object.keys(ErrorCodeMsgMap).includes(`${returnCode}`)
    ? ErrorCodeMsgMap[returnCode as keyof typeof ErrorCodeMsgMap]
    : body.returnMsg || 'System is busy, please try again'

  if (returnCode !== 0) {
    const error = new Error(errorMessage) as any
    error.returnCode = returnCode
    error.returnData = body.data
    throw error
  }

  return body.data
}

export function get<T>(url: string, params?: any) {
  return axios
    .get(url, {
      ...AXIOS_COMMON_CONFIG,
      params
    })
    .then(response => yukkiResponseHandler<T>(response))
}

export function post<T>(url: string, body: any) {
  return axios
    .post(url, body, {
      ...AXIOS_COMMON_CONFIG
    })
    .then(response => yukkiResponseHandler<T>(response))
}

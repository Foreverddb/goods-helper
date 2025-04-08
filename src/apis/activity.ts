import { get } from '@/utils/request'

export interface Activity {
  activityName: string
  activityId: number
  beginTime: string
  endTime: string
  imgUrl?: string
}

export const getActivityList = (): Promise<{ data: Activity[] }> => get('/api/test-activity')

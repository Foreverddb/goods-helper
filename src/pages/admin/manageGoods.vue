<template>
  <div
    :style="{
      backgroundImage: `url('/${bandTheme}/${bandTheme}.png')`
    }"
    class="manage-goods"
    :class="bandTheme"
    v-loading="loading"
  >
    <div class="manage-nav-container">
      <div class="row-1">
        <div class="manage-title">
          {{ title }}
        </div>

        <div class="theme">
          <img :src="icons.themeIcon" @click="switchTheme" alt="theme" style="height: 20px" />
        </div>
        <div class="search">
          <img :src="icons.searchIcon" @click="editSearch" alt="search" style="height: 20px" />
        </div>
      </div>

      <div class="row-2">
        <div class="input-content">
          <input v-model="searchStr" />
        </div>

        <div class="deadline-confirm">
          <img :src="icons.confirmIcon" alt="confirm" style="height: 40px" />
        </div>
      </div>
    </div>
    <div class="manage-content">
      <ActivityCard
        v-for="item in activityList"
        :activity-id="item.activityId"
        :activity-name="item.activityName"
        :begin-time="item.beginTime"
        :end-time="item.endTime"
        :key="item.activityId"
      ></ActivityCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getActivityList, type Activity } from '@/apis/activity'

import icons from '@/assets/icons'
import ActivityCard from '@/components/activity-card.vue'

import testImg from '@/components/assets/popipa.png'
import { ElMessage } from 'element-plus'

const title = ref('chuchu 的午夜后宫')
const searchStr = ref('搜索')

const switchEditSearch = ref(false)
const editSearch = () => {
  switchEditSearch.value = !switchEditSearch.value
  const target = document.body.querySelector('.manage-nav-container') as HTMLElement
  if (switchEditSearch.value) {
    target.style.height = '5em'
  } else {
    target.style.height = '2.5em'
  }
}

const activityList = ref<Array<Activity>>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getActivityList()
    activityList.value = res.data
    ElMessage.success('获取活动列表成功')
    loading.value = false
  } catch (error) {
    console.error('Failed to fetch activity list:', error)
    loading.value = false
  }
})

const bandTheme = ref(window.localStorage.getItem('theme') || 'popipa')

defineModel('theme', {
  default: () => window.localStorage.getItem('theme') || 'popipa'
})

// 切换主题
const themeList = ['popipa', 'roselia', 'ras', 'hhw', 'monica', 'mygo']
let themeIdx = themeList.indexOf(bandTheme.value)

function switchTheme() {
  const curIdx = ++themeIdx % themeList.length
  bandTheme.value = themeList[curIdx]
  window.localStorage.setItem('theme', bandTheme.value)
}
</script>

<style lang="less" scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');
.manage-goods {
  height: 100%;
}

.manage-content {
  display: flex;
  max-height: 80vh;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
}

.manage-nav-container {
  display: flex;
  flex-direction: column;
  //justify-content: center;

  height: 2.5em;
  width: 100%;

  z-index: 100;

  font-size: 24px;

  //margin: 5px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;

  transition: all 0.3s ease-in-out;

  position: sticky;
  top: 0;

  overflow: hidden;

  font-family: 'Noto Sans SC', serif;

  .row-1 {
    display: flex;
    align-items: center;
    width: 100%;
    height: 2em;
    margin-top: 5px;

    .manage-title {
      margin: 10px 20px;
    }

    .search {
      display: flex;
      justify-content: center;
      align-items: center;

      position: absolute;
      right: 20px;
    }

    .theme {
      display: flex;
      justify-content: center;
      align-items: center;

      position: absolute;
      right: 50px;
    }
  }

  .row-2 {
    height: 1.5em;
    margin: 0.5em 0;

    transition: all 0.3s ease-in-out;

    display: flex;
    align-items: center;

    .input-content {
      display: flex;
      align-items: center;
      margin: 0 20px;
      flex: 1;

      input {
        height: 2.5em;
        border: none;
        outline: none;
        border-radius: 20px;

        width: 95%;
        padding: 0 20px;
      }
    }

    .deadline-confirm {
      margin: 0 20px;

      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>

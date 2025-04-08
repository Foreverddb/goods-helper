<template>
  <div class="activity-container" @click="openGoodsList">
    <div class="activity-img">
      <img :src="props.imgUrl" alt="img" />
    </div>
    <div class="activity-info">
      <div class="activity-name">{{ activityName }}</div>
      <el-tag class="activity-tag" :type="tagType">{{ tagText }}</el-tag>
      <!-- <div class="activity-begin">{{ beginTime }}</div>
      <div class="activity-end">{{ endTime }}</div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import testImg from '@/components/assets/popipa.png';
import dayjs from 'dayjs';
import { computed } from 'vue';
const props = withDefaults(
  defineProps<{
    activityName: string;
    activityId: number | string;
    beginTime: string;
    endTime: string;
    imgUrl?: string;
  }>(),
  {
    imgUrl: testImg
  }
);

const tagText = computed(() => {
  return dayjs(props.endTime).isBefore(dayjs()) ? '进行中' : '已截止';
});
const tagType = computed(() => {
  return dayjs(props.endTime).isBefore(dayjs()) ? '' : 'danger';
});

const openGoodsList = () => {
  window.open(
    `/goodsList?activityId=${props.activityId}&activityName=${props.activityName}&endTime=${props.endTime}`
  );
};
</script>

<style lang="less" scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');
.activity-container {
  min-width: 40%;
  max-width: 40%;
  min-height: 260px;
  max-height: 260px;

  padding: 10px;

  border-radius: 5px;

  display: flex;
  flex-direction: column;
  font-family: 'Noto Sans SC', serif;
}

.activity-img {
  min-height: 80%;
  max-height: 80%;
  overflow: hidden;
  border-radius: 5px;

  img {
    max-width: 100%;
    // max-height: 100%;
    object-fit: cover;

    border-radius: 5px;
  }
}

.activity-info {
  display: flex;
  flex-direction: column;
  min-width: 100%;

  font-size: 14px;
  margin-top: 5px;

  width: 60%;

  .activity-tag {
    margin: 5px 0 !important;
  }

  .activity-name {
    width: 90%;
  }
}
</style>

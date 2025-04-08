<template>
  <div class="activity-container" @click="openGoodsList">
    <div class="activity-img">
      <img :src="props.imgUrl" alt="img" />
    </div>
    <div class="activity-info">
      <div class="activity-tag">{{ tagText }}</div>
      <div class="activity-name">{{ activityName }}</div>
      <!-- <div class="activity-begin">{{ beginTime }}</div>
      <div class="activity-end">{{ endTime }}</div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import testImg from "@/components/assets/popipa.png";
import dayjs from "dayjs";
import { computed } from "vue";
const props = withDefaults(
  defineProps<{
    activityName: string;
    activityId: number | string;
    beginTime: string;
    endTime: string;
    imgUrl?: string;
  }>(),
  {
    imgUrl: testImg,
  }
);

const tagText = computed(() => {
  return dayjs(props.endTime).isBefore(dayjs()) ? "进行中" : "已截止";
});

const openGoodsList = () => {
  window.open(`/goodsList?activityId=${props.activityId}`);
};
</script>

<style lang="less" scoped>
.activity-container {
  min-width: 40%;
  max-width: 40%;
  min-height: 200px;
  max-height: 200px;

  padding: 10px;

  border-radius: 5px;

  display: flex;
  flex-direction: column;
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
    padding: 1px;
  }

  .activity-name {
    width: 90%;
  }
}
</style>

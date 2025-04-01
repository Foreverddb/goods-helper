<template>
  <div class="activity-container">
    <div class="activity-img">
      <img :src="imgUrl" alt="img" />
    </div>
    <div class="activity-info">
      <div class="activity-name">{{ activityName }}</div>
      <!-- <div class="activity-begin">{{ beginTime }}</div>
      <div class="activity-end">{{ endTime }}</div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  activityName: string;
  activityId: number | string;
  beginTime: string;
  endTime: string;
  imgUrl?: string;
}>();
</script>

<style lang="less" scoped>
.activity-container {
  min-width: 40%;
  min-height: 200px;
  max-height: 200px;
  flex-direction: column;

  padding: 10px;

  border-radius: 5px;

  display: flex;
}

.activity-info {
  display: flex;
  flex-direction: column;

  font-size: 12px;

  width: 60%;
}
</style>

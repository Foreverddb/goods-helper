<template>
  <div class="activity-container"></div>
</template>

<script setup lang="ts">
const props = defineProps<{
  activityName: string;
  activityId: number | string;
  beginTime: string;
  endTime: string;
}>();
</script>

<script setup lang="ts">
import {ref} from "vue";
import icons from "@/assets/icons"



const title = defineModel("title", {
  default: () => '标题'
})

const deadline = defineModel("deadline", {
  default: () => ''
})
</script>

<template>
  <div class="navbar-container">
    <div class="goods-title">
      {{ title }}
    </div>

    <div class="deadline">
      <img :src="icons.deadlineIcon" alt="deadline" style="height: 20px"/>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');

.navbar-container {
  display: flex;
  align-items: center;
  //justify-content: center;

  position: fixed;
  top: 0;

  height: 2.5em;
  width: 100%;

  z-index: 100;

  font-size: 24px;

  //margin: 5px;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;

  .goods-title {
    font-family: "Noto Sans SC", serif;
    margin: 10px 20px;
  }

  .deadline {
    display: flex;
    justify-content: center;
    align-items: center;

    position: absolute;
    right: 20px;
  }

}
</style>
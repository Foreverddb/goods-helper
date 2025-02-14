<script setup lang="ts">
import {ref} from "vue";

const title = ref("标题asdfd")
</script>

<template>
  <div class="navbar-container">
    <div class="goods-title">
      {{ title }}
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
  //border-radius: 5px;

  .goods-title {
    font-family: "Noto Sans SC", serif;

    margin: 10px;
  }

}
</style>
<script setup lang="ts">
import {ref} from "vue";
import icons from "@/assets/icons"



const title = defineModel("title", {
  default: () => '标题'
})

const deadline = defineModel("deadline", {
  default: () => ''
})

const editTitle = () => {

}

const switchEditDeadline = ref(false)
const editDeadline = () => {
  switchEditDeadline.value = !switchEditDeadline.value
  const target = document.body.querySelector(".navbar-container") as HTMLElement
  console.log(target)
  if (switchEditDeadline.value) {
    target.style.height = "5em"
  } else {
    target.style.height = "2.5em"
  }
}
</script>

<template>
  <div class="navbar-container">
    <div class="row-1">
      <div class="goods-title" @click="editTitle">
        {{ title }}
      </div>

      <div class="deadline" @click="editDeadline">
        <img :src="icons.deadlineIcon" alt="deadline" style="height: 20px"/>
      </div>
    </div>

    <div class="row-2">
      <div class="input-content">
        <input v-model="deadline">
      </div>

      <div class="deadline-confirm">
        <img :src="icons.confirmIcon" alt="confirm" style="height: 40px"/>

      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&display=swap');

.navbar-container {
  display: flex;
  flex-direction: column;
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

  transition: all 0.3s ease-in-out;

  overflow: hidden;

  font-family: "Noto Sans SC", serif;

  .row-1 {
    display: flex;
    align-items: center;
    width: 100%;
    height: 2em;
    margin-top: 5px;

    .goods-title {
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

  .row-2 {
    height: 1.5em;
    margin: .5em 0;

    transition: all 0.3s ease-in-out;

    display: flex;
    align-items: center;

    .input-content {
      margin: 0 20px;
      flex: 1;

      input {
        height: 2.5em;
        border: none;
        outline: none;
        border-radius: 20px;

        width: 95%;
        padding: 0 20px;
      };
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
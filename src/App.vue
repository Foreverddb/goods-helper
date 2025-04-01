<script setup lang="ts">
import { onMounted, ref } from "vue";
const textarea = ref<HTMLTextAreaElement | null>(null);

const innerHeight = ref("100vh");
/**
 * 乐队主题切换
 */
const bandTheme = ref(window.localStorage.getItem("theme") || "popipa");

onMounted(() => {
  innerHeight.value = window.innerHeight + "px";

  const textareaDom = textarea.value;
  if (!textareaDom) {
    return;
  }
  textareaDom.addEventListener("input", (e) => {
    textareaDom.style.height = "100px";
    textareaDom.style.height =
      (e.target as HTMLTextAreaElement).scrollHeight + "px";
  });
});
</script>

<template>
  <main
    :style="{
      '--inner-height': innerHeight,
    }"
    class="wrap"
  >
    <div
      :style="{
        backgroundImage: `url('/${bandTheme}/${bandTheme}.png')`,
      }"
      class="content"
      :class="bandTheme"
      id="wrap"
    >
      <router-view></router-view>
    </div>
    <canvas v-show="false" id="canvas"></canvas>
  </main>
</template>

<style lang="less" src="./style.less"></style>

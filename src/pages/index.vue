<!-- pages/index.vue -->
<template>
  <div>
    <h1>Nuxt Demo</h1>
    <button @click="handleClick">点击测试</button>

    <!-- 显示响应结果 -->
    <div v-if="result">响应结果: {{ result }}</div>
  </div>
</template>

<script setup lang="ts">
const result = ref(null);

const handleClick = async () => {
  try {
    // 调用后端 API
    const response = await $fetch("/api/test", {
      method: "POST",
      body: {
        time: new Date().toISOString(),
      },
    });

    result.value = response;
  } catch (error) {
    console.error("Error:", error);
  }
};
</script>

<style scoped>
div {
  padding: 20px;
}

button {
  padding: 10px 20px;
  margin: 10px 0;
  cursor: pointer;
}
</style>

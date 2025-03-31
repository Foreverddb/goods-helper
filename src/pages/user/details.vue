<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
// import { useUserStore } from '@/stores/userStore'

const route = useRoute();
// const userStore = useUserStore();

const user = ref({
  name: 'C4iN',
  email: '123456@123.com',
  createdAt: new Date(),
});
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const userId = route.params.id;
    // user.value = await userStore.getUserDetail(userId);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="user-detail">
    <div v-if="loading">加载中...</div>

    <div v-else-if="error" class="error">
      {{ error }}
    </div>

    <div v-else class="user-info">
      <h1>用户详情</h1>
      <div class="info-item">
        <label>用户名:</label>
        <span>{{ user.name }}</span>
      </div>

      <div class="info-item">
        <label>邮箱:</label>
        <span>{{ user.email }}</span>
      </div>

      <div class="info-item">
        <label>注册时间:</label>
        <span>{{ new Date(user.createdAt).toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

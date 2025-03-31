<!-- eslint-disable vue/html-self-closing -->
<!-- pages/user/login.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'nuxt/app';
// import { useUserStore } from '@/stores/userStore';

const router = useRouter();
// const userStore = useUserStore();

const form = ref({
  email: '',
  password: '',
});

const id = ref('111');
const loading = ref(false);
const error = ref('');
const detailPath = computed(() => `/user/detail?id=${id.value}`);

async function handleLogin() {
  try {
    loading.value = true;
    error.value = '';

    // await userStore.login(form.value);
    router.push(detailPath.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-container_title">欢迎</div>
      <el-form class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <el-input v-model="form.email" class="login-container_input" type="email" placeholder="邮箱" required />
        </div>

        <div class="form-group">
          <el-input v-model="form.password" class="login-container_input" type="password" placeholder="密码" required />
        </div>

        <div v-if="error" class="error">
          {{ error }}
        </div>

        <el-button class="login-button" type="primary" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </el-button>

        <div class="register-links">
          <NuxtLink to="/user/register">没有账号？去注册</NuxtLink>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100%;
  max-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  .login-container {
    display: flex;
    flex-direction: column;
    align-items: center;

    min-width: 300px;
    max-width: 400px;
    background-color: white;
    padding: 10px;

    border-radius: 5px;

    filter: drop-shadow(5px 5px 10px rgba(0, 0, 0, 0.6));

    &_title {
      font-size: 24px;
      margin: 10px;
    }

    &_input {
      width: 200px;
      border-radius: 30px;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .login-button {
      width: 200px;
      border-radius: 30px;
    }

    .register-links {
      text-decoration: none;
      font-size: 12px;

      a {
        color: grey;
        text-decoration: none;
      }
    }
  }
}

.form-group {
  margin-bottom: 15px;
}

.error {
  color: red;
  margin: 10px 0;
}

@media screen and (min-width: 400px) {
}
</style>

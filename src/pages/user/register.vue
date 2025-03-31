<!-- eslint-disable vue/html-self-closing -->
<!-- pages/user/register.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'nuxt/app';
// import { useUserStore } from '@/stores/userStore';

const router = useRouter();
// const userStore = useUserStore();

const form = ref({
  email: '',
  password: '',
  rePassword: '',
});

const id = ref('111');
const loading = ref(false);
const error = ref('');
const detailPath = computed(() => `/user/detail?id=${id.value}`);

async function handleregister() {
  try {
    loading.value = true;
    error.value = '';

    // await userStore.register(form.value);
    router.push(detailPath.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-container_title">欢迎</div>
      <el-form class="register-form" @submit.prevent="handleregister">
        <div class="form-group">
          <el-input v-model="form.email" class="register-container_input" type="email" placeholder="邮箱" required />
        </div>

        <div class="form-group">
          <el-input
            v-model="form.password"
            class="register-container_input"
            type="password"
            placeholder="密码"
            required
          />
        </div>

        <div class="form-group">
          <el-input
            v-model="form.password"
            class="register-container_input"
            type="rePassword"
            placeholder="确认密码"
            required
          />
        </div>

        <div v-if="error" class="error">
          {{ error }}
        </div>

        <el-button class="register-button" type="primary" :disabled="loading">
          {{ loading ? '注册...' : '注册' }}
        </el-button>

        <div class="register-links">
          <NuxtLink to="/user/login">已有账号？去登陆</NuxtLink>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.register-page {
  min-height: 100%;
  max-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;

  .register-container {
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

      .el-input__wrapper {
        border-radius: 30px !important;
      }
    }

    .register-form {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .register-button {
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

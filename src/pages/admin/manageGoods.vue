<template>
  <div class="content" id="wrap">
    <navigation-bar
      v-model:title="title"
      v-model:deadline="ddl"
    ></navigation-bar>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import NavigationBar from "@/components/navigation-bar.vue";

const title = ref("chuchu 的午夜后宫");
const ddl = ref("ddl");
</script>

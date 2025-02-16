<script setup lang="ts">
import {inject, ref} from "vue";
import {TableValue} from "@/typings.ts";

const confirmAdd = inject("confirmAdd");

const showAdd = defineModel("show", {
  default: () => false
})

const editingAdd = defineModel<TableValue | null>("edit", {
  default: () => null
})

function toggleAddModal() {
  showAdd.value = !showAdd.value;
  editingAdd.value = showAdd.value ? new TableValue('', []) : null;
}



</script>

<template>
  <div v-if="showAdd && editingAdd" class="modal goods transparent">
    <div @click="toggleAddModal" class="modal-mask"></div>
    <div class="modal-container">
      <h2>新增表内容</h2>
      <div class="input-wrap">
        <label for="cn">cn</label>
        <input v-model="editingAdd.cn" id="cn"/>
      </div>
      <div class="btn-bar">
        <button class="button" @click="toggleAddModal">返回</button>
        <button class="button" @click="confirmAdd">确认新增</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">

</style>
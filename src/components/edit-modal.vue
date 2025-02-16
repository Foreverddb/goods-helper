<script setup lang="ts">

import Decimal from "decimal.js";
import {type Goods, TableValue} from "@/typings.ts";
import {inject} from "vue";

const toggleEditGoodsModal = inject("toggleEditGoodsModal")
const confirmAddGoods = inject("confirmAddGoods")
const deleteEditGoods = inject("deleteEditGoods")

const showGoodsEdit = defineModel("show", {
  default: () => false
})
const isAddGoods = defineModel("is-added", {
  default: () => false
})
const editingGoods = defineModel<Goods & {
  originList?: Goods[];
  originIndex?: number;
} | null>("edit", {
  default: () => null
})



</script>

<template>
  <div v-if="showGoodsEdit && editingGoods" class="modal goods transparent">
    <div @click="toggleEditGoodsModal" class="modal-mask"></div>
    <div class="modal-container">
      <h2>编辑谷子</h2>
      <div v-if="!isAddGoods">此处的修改会自动保存</div>
      <div class="input-wrap">
        <label for="name">谷子名称</label>
        <input v-model="editingGoods.name" id="name"/>
      </div>
      <div class="input-wrap">
        <label for="price">谷子单价</label>
        <input type="number" id="price" :value="editingGoods.price"
               @input="(e) => editingGoods!.price = new Decimal(e?.target?.value || 0)"/>
      </div>
      <div class="input-wrap">
        <label for="quantity">谷子数量</label>
        <input type="number" id="quantity" :value="editingGoods.quantity"
               @input="(e) => editingGoods!.quantity = new Decimal(e?.target?.value || 0)"/>
      </div>
      <div class="btn-bar">
        <button class="button" @click="toggleEditGoodsModal">返回</button>
        <button v-if="isAddGoods" class="button" @click="confirmAddGoods">新增</button>
        <button v-else class="button" @click="deleteEditGoods">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">

</style>
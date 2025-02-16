<script setup lang="ts">

import DeleteIcon from "@/assets/icons/delete.svg";
import EditIcon from "@/assets/icons/edit.svg";
import {inject} from "vue";
import type {Goods, TableValue} from "@/typings.ts";
import EditModal from "@/components/edit-modal.vue";

const editCn = inject('editCn');
const deleteTableValue = inject('deleteTableValue');
const addGoods = inject('addGoods');
const editGoods = inject('editGoods');

const props = defineProps<{
  data: TableValue
  index: number
}>()

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
  <div class="item-container">
    <div class="cn">
      <span>cn：</span>
      {{ data.cn }}
      <div class="action">
        <img :src="EditIcon" @click="editCn(data)" style="width: 1.2rem" alt="edit"/>
        <img :src="DeleteIcon" @click="deleteTableValue(index)" style="width: 1.2rem" alt="delete"/>
      </div>
    </div>
    <div class="goods-list">
      <span>类型：</span>
      <div @click="editGoods(goods, data.goodsList, goodsIndex)"
           v-for="(goods, goodsIndex) in data.goodsList" class="goods-item tag">
        {{ goods.name }} * {{ goods.quantity.toString() }}
        <img :src="EditIcon" style="width: 1.2rem" alt="edit"/>
      </div>
      <div style="background: palevioletred" class="goods-item" @click="addGoods(data.goodsList)">点击新增</div>
    </div>
    <div class="total-price">
      <span>金额：</span>
      {{ data.totalPrice.toString() }}
    </div>
    <div class="actions">
    </div>
  </div>

  <edit-modal
      v-model:show="showGoodsEdit"
      v-model:edit="editingGoods"
      v-model:is-added="isAddGoods"
  />
</template>

<style scoped lang="less">
.item-container {
  width: 90%;
  border-radius: 1rem;
  padding: .5rem;
  font-size: 1.3rem;
  display: flex;
  flex-direction: column;


  span {
    font-size: 1.1rem;
    color: gray;
    margin-right: .4rem;
    font-weight: 600;
  }

  .cn {
    margin: 5px 0;
    padding: .5rem;
    border-bottom: .1rem dotted rgba(255, 255, 255, 0.7);
    display: flex;
    font-weight: 400;
  }

  .goods-list {
    padding: .5rem;
    display: flex;
    gap: .3rem;
    flex: 1;
    border-bottom: .1rem dotted rgba(255, 255, 255, 0.7);
    align-items: center;
    flex-wrap: wrap;

    .goods-item {
      display: flex;
      font-size: 1.2rem;
      background: #4bc4f1;
      padding: .3rem 1rem;
      margin: 5px 0;
      white-space: nowrap;
      border-radius: .6rem;
      align-items: center;
      gap: .3rem;
    }
  }

  .total-price {
    margin: 5px 0;
    padding: .5rem;
  }

  .action {
    font-size: 1rem;
    font-weight: 300;
    margin-left: auto;
    display: flex;
    gap: 1rem   ;
  }
}
</style>
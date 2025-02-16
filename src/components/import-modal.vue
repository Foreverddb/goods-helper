<script setup lang="ts">
import {inject} from "vue";

const toggleImportModal = inject("toggleImportModal")
const importTable = inject("importTable")

const showImportModal = defineModel("show")
const importType = defineModel("import", {
  default: () => "order"
})
const importPrefix = defineModel("prefix", {
  default: () => ""
})
const importSuffix = defineModel("suffix", {
  default: () => ""
})
const importValue = defineModel("value", {
  default: () => ""
})


</script>

<template>
  <div v-if="showImportModal" class="modal">
    <h2>从拼谷助手导入</h2>
    <div class="radio">
      <div>
        <input v-model="importType" id="order" value="order" name="type" type="radio" checked/>
        <label for="order">排表</label>
      </div>
      <div>
        <input v-model="importType" id="summary" value="summary" name="type" type="radio"/>
        <label for="summary">汇总表</label>
      </div>
    </div>
    <div style="display:flex;flex-direction: column;gap: 1rem;">
      <div class="input-wrap">
        <label for="prefix">谷子前缀</label>
        <input v-model="importPrefix" id="prefix"/>
      </div>
      <div class="input-wrap">
        <label for="suffix">谷子后缀</label>
        <input v-model="importSuffix" id="suffix"/>
      </div>
      <div>
        前后缀含义：在导入数据时默认会使用拼谷助手表格内的谷名称如“ykn”，假如前缀为“涩谷”，后缀为“吧唧”，则最后生成的名称为“涩谷ykn吧唧”。可不填前后缀。
      </div>
    </div>
    <div class="import-area" style="margin-top: 1rem;">
                    <textarea
                        placeholder="将从 拼谷助手-导出表格-复制表格内容 得到的文本粘贴于此，点击“导入”即可自动生成肾表"
                        v-model="importValue" ref="textarea"/>
    </div>
    <div class="btn-bar">
      <button class="button" @click="toggleImportModal">取消</button>
      <button class="button" @click="importValue = '';importSuffix = '';importPrefix = '';">清空</button>
      <button class="button" @click="importTable">导入</button>
    </div>
  </div>
</template>

<style scoped lang="less">

</style>
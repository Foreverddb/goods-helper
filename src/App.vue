<script setup lang="ts">
import dom2Image from 'dom-to-image';
import dayjs from 'dayjs';
import {computed, nextTick, onMounted, provide, ref, watch} from 'vue';
import type {Goods} from '@/typings.ts';
import {TableValue} from '@/typings.ts';
import Decimal from 'decimal.js';
import NavigationBar from "@/components/navigation-bar.vue";
import ActionMenu from "@/components/action-menu.vue";
import GoodCard from "@/components/good-card.vue";
import ImportModal from "@/components/import-modal.vue";

const imgScale = 5;
const showPreview = ref(false);
const showImportModal = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);
const showGoodsEdit = ref(false);
const showCnEdit = ref(false);
const showTitleEdit = ref(false);
const showDDLEdit = ref(false);
const showAdd = ref(false);
const isAddGoods = ref(false);
const codeLoaded = ref(false);
const showImage = ref(false);
const loading = ref(false);
const image = ref<HTMLImageElement>();

const title = ref('标题');
const ddl = ref('ddl');
const innerHeight = ref('100vh');

const importType = ref('order');
const importPrefix = ref('');
const importSuffix = ref('');
const importValue = ref('');
const tableValue = ref<TableValue[]>([]);
const editingGoods = ref<Goods & {
    originList?: Goods[];
    originIndex?: number;
} | null>(null);
const editingTableValue = ref<TableValue | null>(null);
const editingAdd = ref<TableValue | null>(null);

const allTotalPrice = computed(() => {
   return tableValue.value.reduce((previousValue, currentValue) => {
       return Decimal.add(previousValue, currentValue.totalPrice);
   }, new Decimal(0));
});

const displayTableValue = computed(() => {
    if (tableValue.value.length >= 20) {
        return tableValue.value;
    } else {
        const data = [...tableValue.value];
        const offset = 20 - tableValue.value.length;
        for (let i = 0;i < offset;i ++) {
            data.push({
                cn: '',
                goodsList: [],
                totalPrice: ''
            });
        }

        return data;
    }
});

function preview() {
    const wrap = document.getElementById('wrap');
    if (wrap) {
        wrap.scrollLeft = 0;
    }
    showPreview.value = !showPreview.value;
}

async function exportImage() {
    if (!codeLoaded.value) {
        alert('表格暂未加载成功， 请稍等片刻重试！');
        return;
    }

    try {
        loading.value = true;
        const node = document.getElementById('preview-wrap') as Node;
        console.log('started');
        const svgUrl = await dom2Image.toSvg(node);
        console.log('converted');
        const img = new Image();

        img.onload = (e) => {
            console.log('loaded');
            const target = e.target as HTMLImageElement;
            const width = target.width * imgScale;
            const height = target.height * imgScale;

            const isSafari = /Safari/.test(navigator.userAgent) && /iPhone/.test(navigator.userAgent);
            if (isSafari) {
                // ios safari无法通过canvas渲染高精图
                img.width = width;
                img.height = height;
                loading.value = false;
                image.value = img;
                showImage.value = true;
                return;
            }

            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            const ctx = canvas.getContext('2d');

            canvas.width = width;
            canvas.height = height;
            img.width = width;
            img.height = height;

            ctx?.drawImage(img, 0, 0, width, height);

            const url = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.download = `肾表${dayjs().format('YYYYMMDD-HHmm')}.png`;
            link.href = url;
            link.click();
            loading.value = false;

        };

        img.src = svgUrl;
    } catch (e) {
        alert('导出错误：' + e);
    }
}

function addNewGoods(cn: string, goods: Goods[]) {
    const index = tableValue.value.findIndex((item) => item.cn === cn);
    if (index === -1) {
        tableValue.value.push(new TableValue(cn, goods));
    } else {
        tableValue.value[index].addGoodsList(goods);
    }
}

function importTable() {
    try {
        console.log(importValue.value);
        const rows = importValue.value.split('\n');
        const types = rows[1].split('\t');
        const prices = rows[2].split('\t');

        // 因为前面有4行，分别为标题、种类、单价、表头，故index从4开始
        if (importType.value === 'summary') {
            for (let index = 4; index < rows.length; index++) {
                const data = rows[index].split('\t');
                const cn = data[1];
                const goods: Goods[] = [];

                if (data.length <= 1) {
                    console.log(data);
                    throw new Error();
                }
                for (let i = 2; i < data.length; i++) {
                    if (data[i]) {
                        goods.push({
                            name: importPrefix.value + types[i] + importSuffix.value,
                            quantity: new Decimal(data[i]),
                            price: new Decimal(prices[i]),
                        });
                    }
                }
                addNewGoods(cn, goods);
            }
        } else if (importType.value === 'order') {
            const valueList: {
                [cn: string]: Goods[];
            } = {};

            // 因为前面有3行，分别为标题、种类、单价，故index从4开始
            for (let index = 3; index < rows.length; index++) {
                const data = rows[index].split('\t');

                if (data.length <= 1) {
                    console.log(data);
                    throw new Error();
                }

                for (let i = 1; i < data.length; i++) {
                    if (data[i]) {
                        const cn = data[i];
                        const price = new Decimal(prices[i]);
                        const type = importPrefix.value + types[i] + importSuffix.value;

                        if (valueList[cn]) {
                            const goods = valueList[cn];
                            const index = goods.findIndex((item) => item.name === type);
                            if (index !== -1) {
                                goods[index].quantity = goods[index].quantity.plus(1);
                            } else {
                                goods.push({
                                    name: type,
                                    quantity: new Decimal(1),
                                    price,
                                });
                            }
                        } else {
                            valueList[cn] = [{
                                name: type,
                                quantity: new Decimal(1),
                                price,
                            }];
                        }
                    }
                }
            }

            for (const cn of Object.keys(valueList)) {
                addNewGoods(cn, valueList[cn]);
            }
        }

        showImportModal.value = false;

        console.log(tableValue.value);
    } catch (e) {
        console.error(e);
        alert('导入错误，请确认你已粘贴正确的表格内容！若持续出错请尝试重新从拼谷助手复制');
    }
}
provide("importTable", importTable);

function toggleImportModal() {
    showImportModal.value = !showImportModal.value;
    importValue.value = '';
    importSuffix.value = '';
    importPrefix.value = '';
}
provide("toggleImportModal", toggleImportModal)

function toggleEditGoodsModal() {
    showGoodsEdit.value = !showGoodsEdit.value;
    if (!showGoodsEdit.value) {
        editingGoods.value = null;
        isAddGoods.value = false;
    }
}
provide("toggleEditGoodsModal", toggleEditGoodsModal)

function toggleEditCnModal() {
    showCnEdit.value = !showCnEdit.value;
}

function toggleEditTitleModal() {
    showTitleEdit.value = !showTitleEdit.value;
}

function toggleEditDDLModal() {
    showDDLEdit.value = !showDDLEdit.value;
}

function toggleAddModal() {
    showAdd.value = !showAdd.value;
    editingAdd.value = showAdd.value ? new TableValue('', []) : null;
}

function confirmAdd() {
    if (!editingAdd.value) {
        return;
    }
    tableValue.value.push(editingAdd.value);
    toggleAddModal();
}

function editGoods(goods: Goods, originList: Goods[], originIndex: number) {
    toggleEditGoodsModal();
    editingGoods.value = goods;
    editingGoods.value.originList = originList;
    editingGoods.value.originIndex = originIndex;
}

function addGoods(originList: Goods[]) {
    toggleEditGoodsModal();
    isAddGoods.value = true;
    editingGoods.value = {
        name: '',
        price: new Decimal(0),
        quantity: new Decimal(0),
        originList,
    };
}

function confirmAddGoods() {
    if (!editingGoods.value || !editingGoods.value.originList) {
        return;
    }
    editingGoods.value.originList.push({
       name: editingGoods.value?.name,
       price: editingGoods.value?.price,
       quantity: editingGoods.value?.quantity,
    });
    toggleEditGoodsModal();
}
provide("confirmAddGoods", confirmAddGoods)

function deleteEditGoods() {
    if (!editingGoods.value?.originList || editingGoods.value?.originIndex === undefined || editingGoods.value?.originIndex === -1) {
        alert('删除失败！')
        return;
    }
    if (confirm('您确认要删除吗？')) {
        editingGoods.value.originList.splice(
            editingGoods.value.originIndex,
            1,
        );
        toggleEditGoodsModal();
    }
}
provide("deleteEditGoods", deleteEditGoods)

function editCn(tableValue: TableValue) {
    toggleEditCnModal();
    editingTableValue.value = tableValue;
}

function deleteTableValue(index: number) {
    if (confirm('您确认要删除吗?删除后该cn吃的谷子将一并删除')) {
        tableValue.value.splice(index, 1);
    }
}
provide('editCn', editCn)
provide('deleteTableValue', deleteTableValue)
provide('addGoods', addGoods)
provide('editGoods', editGoods)

const imgHeight = ref('100%');

watch(showPreview, () => {
   nextTick(() => {
       const preview = document.getElementById('preview-wrap');
       preview && (imgHeight.value = getComputedStyle(preview).height);
       const priceHeader = document.getElementById('priceHeader');
       const allTotalPrice =  document.getElementById('allTotalPrice');

       if (!priceHeader || !allTotalPrice) {
           return;
       }
      allTotalPrice.style.width = getComputedStyle(priceHeader).width;
   });
});

const fontFamily = ref('my-song, SimSun, "宋体", "Songti SC", sans-serif');
function changeFont(e) {
    fontFamily.value = e.target.value;
}

/**
 * 乐队主题切换
 */
const bandTheme = ref(window.localStorage.getItem('theme') || "popipa")

watch(tableValue, () => console.log(tableValue.value))

onMounted(() => {
    innerHeight.value = window.innerHeight + 'px';

    const textareaDom = textarea.value;
    if (!textareaDom) {
        return;
    }
    textareaDom.addEventListener('input', (e) => {
        textareaDom.style.height = '100px';
        textareaDom.style.height = (e.target as HTMLTextAreaElement).scrollHeight + 'px';
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
        <div :style="{
            backgroundImage: `url('./${bandTheme}/${bandTheme}.png')`,
        }" class="content" id="wrap">
            <!--  预览栏  -->
            <div v-show="showPreview" id="preview-wrap" :style="{
                fontFamily,
            }" class="preview-wrap">
                <div class="preview-wrap-table">
                    <header class="preview-header">
                        <div>{{title}}</div>
                        <div>{{ddl}}</div>
                    </header>
                    <main class="preview-content">
                        <div style="flex: 3;" class="column">
                            <div style="font-size: 1.4rem;border-left: 0.2rem solid black;" class="header">cn</div>
                            <div :style="`
                        background: ${index % 2 === 0 ? '#93dcfd' : 'white'};
                        text-align: left;
                        border-left: 0.2rem solid black;
                        padding-left: .5rem;
                    `"
                                 v-for="(data,index) in displayTableValue" class="row">{{ data.cn }}
                            </div>
                        </div>
                        <div style="flex: 6;" class="column">
                            <div class="header">类型</div>
                            <div :style="`background: ${index % 2 === 0 ? '#93dcfd' : 'white'};`"
                                 v-for="(data,index) in displayTableValue" class="row">
                        <span v-for="(goods,goodsIndex) in data.goodsList">
                            {{ goods.name }}{{ goods.quantity }} {{ goodsIndex !== data.goodsList.length - 1 ? '&nbsp;' : '' }}
                        </span>
                            </div>
                        </div>
                        <div style="flex: 1;border-right: 0.1rem solid black;" class="column">
                            <div class="header" id="priceHeader">金额</div>
                            <div :style="`background: ${index % 2 === 0 ? '#93dcfd' : 'white'};border-right:0.1rem solid black;`"
                                 v-for="(data,index) in displayTableValue" class="row">{{ data.totalPrice }}
                            </div>
                        </div>
                    </main>
                    <footer class="preview-footer">
                        <div class="row">
                            备注<span>CN+{{title}}</span> 肾完提交作业
                        </div>
                        <div class="row summary">
                            <div>合计</div>
                            <div id="allTotalPrice">{{allTotalPrice}}</div>
                        </div>
                    </footer>
                </div>
                <div class="aside">
                    <img @load="codeLoaded = true" src="./code.jpg">
                </div>
            </div>
            <!--  编辑栏  -->
            <div v-show="!showPreview" class="edit-wrap" :class="bandTheme">
                <navigation-bar
                    v-model:title="title"
                    v-model:deadline="ddl"
                ></navigation-bar>

                <action-menu
                    :band-theme="bandTheme"
                    v-model:theme="bandTheme"
                    v-model:preview="showPreview"
                    v-model:table="tableValue"
                    v-model:edit="editingAdd"
                />

<!--                <h2 class="title">{{title}} <edit-icons @click="toggleEditTitleModal" width="1.4rem" height="1.4rem" /></h2>-->
<!--                <h2 class="title">{{ddl}} <edit-icons @click="toggleEditDDLModal" width="1.4rem" height="1.4rem" /></h2>-->
                <good-card
                    v-for="(data, index) in tableValue"
                    :data="data"
                    :index="index"
                    v-model:show="showGoodsEdit"
                    v-model:edit="editingGoods"
                    v-model:is-added="isAddGoods"
                />

                <import-modal
                    v-model:import="importType"
                    v-model:prefix="importPrefix"
                    v-model:suffix="importSuffix"
                    v-model:value="importValue"
                    v-model:show="showImportModal"
                />

            </div>
        </div>

        <!-- 工具栏 -->
        <div class="utils" v-if="showPreview">
            <button @click="preview" class="button">{{ showPreview ? '返回修改' : '预览结果' }}</button>
            <button class="button" v-if="!showPreview && tableValue.length" @click="tableValue = []">清空</button>
            <button class="button"  v-if="!showPreview" @click="toggleAddModal">新增</button>
            <div v-if="showPreview">
                <div>字体选择</div>
                <select @change="changeFont" name="pets" id="pet-select">
                    <option selected value="my-song, SimSun, '宋体', 'Songti SC', sans-serif">宋体</option>
                    <option value="">默认</option>
                </select>
            </div>
            <button class="button" v-if="showPreview" @click="exportImage">导出图片</button>
            <button class="button" v-if="!showPreview" @click="toggleImportModal">导入表格</button>
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
        </div>

        <div v-if="showCnEdit && editingTableValue" class="modal goods transparent">
            <div @click="toggleEditCnModal" class="modal-mask"></div>
            <div class="modal-wrapper">
                <h2>编辑cn</h2>
                <div>此处的修改会自动保存</div>
                <div class="input-wrap">
                    <label for="cn">cn</label>
                    <input v-model="editingTableValue.cn" id="cn"/>
                </div>
                <div class="btn-bar">
                    <button class="button" @click="toggleEditCnModal">返回</button>
                </div>
            </div>
        </div>
        <div v-if="showDDLEdit" class="modal goods transparent">
            <div @click="toggleEditDDLModal" class="modal-mask"></div>
            <div class="modal-wrapper">
                <h2>编辑ddl</h2>
                <div>此处的修改会自动保存</div>
                <div class="input-wrap">
                    <label for="ddl">ddl</label>
                    <input v-model="ddl" id="ddl"/>
                </div>
                <div class="btn-bar">
                    <button class="button" @click="toggleEditDDLModal">返回</button>
                </div>
            </div>
        </div>
        <div v-if="showTitleEdit" class="modal goods transparent">
            <div @click="toggleEditTitleModal" class="modal-mask"></div>
            <div class="modal-wrapper">
                <h2>编辑标题</h2>
                <div>此处的修改会自动保存</div>
                <div class="input-wrap">
                    <label for="title">标题</label>
                    <input v-model="title" id="title"/>
                </div>
                <div class="btn-bar">
                    <button class="button" @click="toggleEditTitleModal">返回</button>
                </div>
            </div>
        </div>

        <div v-if="showImage" class="modal goods transparent">
            <div @click="showImage = false" class="modal-mask"></div>
            <div class="modal-wrapper" id="image-downloader">
                <h2>请长按下面图片-选择“共享”-储存图片</h2>
                <div>储存失败或图片不全可返回重新导出图片</div>
                <div class="image-wrapper">
                    <img :src="image.src" :height="image.height" :width="image.width" />
                </div>
                <div class="btn-bar">
                    <button class="button" @click="showImage = false">返回</button>
                </div>
            </div>
        </div>
        <div v-if="loading" class="modal goods transparent">
            <div class="modal-mask loading">
                加载中...
            </div>
        </div>
        <canvas v-show="false" id="canvas"></canvas>
    </main>

</template>

<style lang="less" src="./style.less"></style>

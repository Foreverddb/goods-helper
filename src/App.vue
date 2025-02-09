<script setup lang="ts">
import dom2Image from 'dom-to-image';
import dayjs from 'dayjs';
import {onMounted, ref} from 'vue';
import type {Goods, TableValue} from '@/typings.ts';
import Decimal from 'decimal.js';

const imgScale = 5;
const showPreview = ref(false);
const showImportModal = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);

const importType = ref('order');
const importValue = ref('');
const tableValue = ref<TableValue[]>([]);

function preview() {
    showPreview.value = !showPreview.value;
}

async function exportImage() {
    const node = document.getElementById('preview-wrap') as Node;
    const svgUrl = await dom2Image.toSvg(node);
    const img = new Image();

    img.onload = (e) => {
        const target = e.target as HTMLImageElement;
        const width = target.width * imgScale;
        const height = target.height * imgScale;

        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
            if (!blob) {
                return;
            }

            const link = document.createElement('a');
            link.download = `肾表${dayjs().format('YYYYMMDD-HHmm')}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
        });
    };

    img.src = svgUrl;
}

function addNewGoods(cn: string, goods: Goods[], totalPrice: Decimal) {
    const index = tableValue.value.findIndex((item) => item.cn === cn);
    if (index === -1) {
        tableValue.value.push({
            cn,
            goodsList: goods,
            totalPrice,
        });
    } else {
        tableValue.value[index].goodsList = tableValue.value[index].goodsList.concat(goods);
        tableValue.value[index].totalPrice = tableValue.value[index].totalPrice.plus(totalPrice);
    }
}

function importTable() {
    try {
        console.log(importValue.value);
        const rows = importValue.value.split('\n');
        console.log(rows);
        const types = rows[1].split('\t');
        const prices = rows[2].split('\t');

        // 因为前面有4行，分别为标题、种类、单价、表头，故index从4开始
        if (importType.value === 'summary') {
            for (let index = 4; index < rows.length; index++) {
                const data = rows[index].split('\t');
                const totalPrice = new Decimal(data[0]);
                const cn = data[1];
                const goods: Goods[] = [];
                for (let i = 2; i < data.length; i++) {
                    if (data[i]) {
                        goods.push({
                            name: types[i],
                            quantity: new Decimal(data[i]),
                            price: new Decimal(prices[i]),
                        });
                    }
                }
                addNewGoods(cn, goods, totalPrice);
            }
        } else if (importType.value === 'order') {
            const valueList: {
                [cn: string]: Goods[];
            } = {};

            // 因为前面有3行，分别为标题、种类、单价，故index从4开始
            for (let index = 3; index < rows.length; index++) {
                const data = rows[index].split('\t');

                for (let i = 1; i < data.length; i++) {
                    if (data[i]) {
                        const cn = data[i];
                        const price = new Decimal(prices[i]);
                        const type = types[i];

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
                const goods = valueList[cn];
                const totalPrice = goods.reduce((previousValue, currentValue) => {
                    return previousValue.plus(currentValue.price.mul(currentValue.quantity));
                }, new Decimal(0));
                addNewGoods(cn, valueList[cn], totalPrice);
            }
        }

        showImportModal.value = false;

        console.log(tableValue.value);
    } catch (e) {
        console.error(e);
        alert('导入错误，请确认你已粘贴正确的表格内容！');
    }
}

function toggleImportModal() {
    showImportModal.value = !showImportModal.value;
    importValue.value = '';
}

onMounted(() => {
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
    <main class="wrap">
        <div v-show="showPreview" id="preview-wrap" class="preview-wrap">
            <header class="preview-header">
                <div>标题</div>
                <div>ddl</div>
            </header>
            <main class="preview-content">
                <div style="flex: 3;" class="column">
                    <div style="font-size: 1.4rem" class="header">cn</div>
                </div>
                <div style="flex: 6;" class="column">
                    <div class="header">类型</div>
                </div>
                <div style="flex: 1" class="column">
                    <div class="header">金额</div>
                </div>
            </main>
        </div>
        <div v-show="!showPreview" class="edit-wrap">
            <div v-for="(data, index) in tableValue" class="edit-item">
                <div class="cn">
                    <span>cn:</span>{{ data.cn }}
                </div>
                <div class="goods-list">
                    <div v-for="(goods, goodsIndex) in data.goodsList" class="goods-item">
                        {{ goods.name }} * {{ goods.quantity.toString() }}
                    </div>
                </div>
                <div class="total-price">
                    {{ data.totalPrice.toString() }}

                </div>
                <div class="actions">
                </div>
            </div>
        </div>
        <div class="utils">
            <button @click="preview" class="button">{{ showPreview ? '返回修改' : '预览结果' }}</button>
            <button class="button" v-if="showPreview" @click="exportImage">导出图片</button>
            <button class="button" v-if="!showPreview" @click="toggleImportModal">导入表格</button>
            <div v-show="showImportModal" class="modal">
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
                <div class="import-area">
                    <textarea
                        placeholder="将从 拼谷助手-导出表格-复制表格内容 得到的文本粘贴于此，点击“导入”即可自动生成肾表"
                        v-model="importValue" ref="textarea"/>
                </div>
                <div class="btn-bar">
                    <button class="button" @click="toggleImportModal">取消</button>
                    <button class="button" @click="importTable">导入</button>
                </div>
            </div>
        </div>
        <canvas v-show="false" id="canvas"></canvas>
    </main>
</template>

<style lang="less">
html {
    font-size: 87.5%;
}

body {
    margin: 0;
}

.wrap {
    padding: 2rem .4rem 7rem;
    overflow: auto;
    height: 100vh;
    box-sizing: border-box;

    .edit-wrap {
        display: flex;
        flex-direction: column;
        gap: .5rem;

        .edit-item {
            border-radius: .6rem;
            background: aliceblue;
            padding: .5rem;
            font-size: 1.3rem;
            display: flex;
            flex-direction: column;

            .cn {
                span {
                    font-size: 1.1rem;
                    color: gray;
                    margin-right: .4rem;
                }
                font-weight: 600;
                padding: .5rem;
                border-bottom: .1rem solid #85d9f8;
            }

            .goods-list {
                padding: .5rem;
                display: flex;
                gap: .1rem;
                flex: 1;
                border-bottom: .1rem solid #85d9f8;
            }

            .total-price {
                width: 4rem;
                border-bottom: .1rem solid #85d9f8;
            }

            .actions {
                width: 4rem;
            }
        }
    }

    .utils {
        background: white;
        position: fixed;
        bottom: 0;
        left: 0;
        padding: 1rem;
        box-sizing: border-box;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-around;
        box-shadow: -.1rem -.2rem .2rem rgba(0, 0, 0, 0.05);

        .button {
            border: none;
            font-weight: 300;
            border-radius: 1rem;
            padding: .5rem 2rem;
            font-size: 1.4rem;
            background: #02BBFF;
        }

        .modal {
            text-align: center;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            padding: .5rem;
            overflow: hidden;
            box-sizing: border-box;

            .radio {
                margin-bottom: 1rem;
                font-size: 1.3rem;
                align-items: center;
                display: flex;
                justify-content: space-around;
            }

            .btn-bar {
                display: flex;
                justify-content: space-around;
                margin-top: 2rem;
            }

            .import-area {
                display: flex;

                textarea {
                    flex: 1;
                    display: block;
                    resize: none;
                    font-size: 1.4rem;
                    min-height: 10rem;
                }
            }
        }
    }

    .preview-wrap {
        font-family: "Songti SC", sans-serif;
        font-weight: 900;
        width: fit-content;

        .preview-header {
            border: 0.2rem solid black;
            color: white;
            font-size: 1.6rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #02BBFF;
            min-width: 62.4rem;
            height: 6.6rem;
        }

        .preview-content {
            display: flex;
            width: 100%;

            .column {
                .header {
                    border-inline: 0.1rem solid black;
                    border-bottom: .2rem solid black;
                    font-size: 1.2rem;
                    line-height: 2.4rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #FF99BB;
                }

                .row {

                }
            }
        }
    }
}
</style>

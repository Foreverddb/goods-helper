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

const showQrCode = ref(false);
const qrPosition = ref(window.localStorage.getItem('qrPosition') || 'right');
const qrCodeUrl = ref(window.localStorage.getItem('qrCode') || 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAKsARsDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9TLaRn3bgQRjqOvGanpkZ+UU+kgEpaKKYBRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAyiiigBVp1NWnUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFJQAtFJS0AFFFFABRRRQAUUUUAFFFFABRRRQAxf6UMcZoX+lDd6APww+Mv/BQb9oHw18YfGejaT49urexsdZu7S2tks4G2xpKyqATHk8CuZb/god+09/0O+p/+CyH/AON1T8JxrN/wUTgVhkf8J7Pwcf8AP29fuX8SPiN4J+D/AIfTXPGeraf4d0kzLALu9AVPMYcL068GrGz8Pv8Ah4d+0/8A9Dvqf/gsh/8AjdJ/w8O/af8A+h21P/wWQ/8Axuv1z/4bi/ZyXhvif4Yz/wBdP/sakh/bc/ZyvJ4oY/iZ4YllkYKibs5YnA/h680hH5DTf8FFP2mreMvN451GOMdXfToQB+Pl19rf8Esf2pvif+0B4/8AGdl498USa/aafp0MttHJBHH5bNIQxBRRnIA6+lfRX/BQe3srr9jj4g3UCRuj6crRyKOCpIII9sGviH/gij/yUr4iY5/4lsP/AKMNAH623WsWVk4S4u4IWx0kkCnp7mvxL+OH7eH7Rfhf4weMdJ0PxlqEWkWepzw2scenwyKsYY7QG8s54r1T/gph+zb8Xfil+0ida8F+DNc13RG0y3gF3p4zGZBksvXsK+wPgZ+018IfC3gHwZ4K13xrpFh40tLOHTbrSLhs3MdwOGjYbeuakD8s/wDh4b+1D/0Ouqf+CuH/AON1+hX/AATF/aK8ffGfwx40u/iZ4jbULyyuYI7T7dDHbFEZXLYCquc4X8q+3V0+wkVStrAy4yp8ocg5r8o/+C1WLHxp8OhB+5VrG6yEAAyHjxn9aAP1UvtesDbyGPUrNJgrbG85GIOD2PXnFfh349/4KBftIaL4z8Q29r411C3sLfULiKIfYIiixrIwXBKegryjwH+y58bfiFouma/4a8D+IdW0S6ZTBe2wzGwDDkc9BzX7JftVaOdM/YV8U211Ypb3dv4YjilRk+dXWNAwPHXINAHzT/wTD/a8+JXxx+KnijSviH4wGr2Frpaz20dwkUWJTIF42gZ4Pf0r9J/+Eh0v/oJWfv8A6Qn+NfzTfC34Q+O/jBq17pvgPw/qHiG+tohNcQaeMskecAnkcZpfiZ8MPH3wY1a30vxto2qeGtQuIvPit70lWePONwwemeKAP6O/Hni2HTfA/iC90/VLVL23sJ5IXWVWIkEbFeM9civw4n/4KFftOpIVj8baoVyTj+y4Rt9s+Xzxivnr4d+In03x94bu7u/eC0t9St5ZpZHJVY1kUsTk9MA1+91r+3F+zqtunmfE7wvjaABvwRwODweaAPySH/BQz9qH/odNU/8ABZD/APG6gb/go9+0lDcLDcfEG8hcsB5cljAp/wDReRX7a/DH43fDP41f2kngXxJpXiQ2Co10tic+WH3bM8Drsb8jX4x/8FTI0tf2yPEhj4X7Natj0Oz/APVQB+uPxe+Imv8Ahv8AZB1rxlp2oeT4jt/DqX8d3tGfNKKd2MY718W/8Ez/ANrj4s/HT44aroXjfxbPrelxaXJPHbPBGiiQMADlVB9fWvY/iJ+0t8MPip+y7f8Aw88KeNNL1vxvq2gJp9hotrITcT3BRcRhQOv19K+Wv2BPAXiL9j34uXvi741aTcfDjw1dWL2UGpa4ojieYnIQEZ5wO9AHrX/BTf8Aag+LfwP+K3hzTPh94gvNJ0650rzriO2tEmDOHYZJKk/nX2d+y58RL3xp8BfBet+KNXhudevbBJbqSZkjdnJOSVGMV0/w5+K/gT41adPqPg7X9P8AFNlbS+S9zZHzFifGducde9fgr+2at5N+1d4+s7QzGSTVmSOONiCzEgAAfWgD+huLVrG4cJFeW8r/AN1JVJ/nT7m+trNQ89xHCp6NI4UGvxD/AGR/gj8SvgD8cPC3xB+JPhvU/CHgqxbzLrXdWAFtAjL8rE5716Z/wVX/AGiPAPxg8M+C4PAfjSx8Qy291NJcLpsxPlqVGAcdOn86AP1vW6iuYt8MizIejI2QfxGa/H68/bO+PUP7X7eER4nvYvDX/CS/YxanT4gBAZcY3FM9K+w/+CUbGb9kfSixaTN/cZdmJLHI9fbFfXosbcS7/IUP/eoA+W/+CkPxk8X/AAP/AGdj4i8F6s2j6yupW8H2oRqxKMSCMEY5r8sU/wCCjX7S147m28d3s6qefJ0+B8Z6A4jr9Hf+CvoC/skzYGP+Jvaf+hV5j/wRbt0uPhf8QNyKx/tO3HzKCcGNun4gUAfGf/Dw79p7/odNT/8ABVD/APG6P+Hh37T3/Q6an/4Kof8A43X7G+Mv2rPgh8N/El5oHibx34e0fWLQhZ7O5YCRD154PYisT/hub9nA9fid4XP/AAL/AOxoA/I3/h4f+08Of+E01P8A8FUP/wAbqvcf8FHP2k4G23Hj+8g3cFZLCBfx/wBXn8q/az4ZfH74T/GnUrvTvAvifRfE97ZxC4uILHDNHGTtDEEDjJx+Nfkz/wAFhoY4f2oNPWONYx/YVucKAOrv2FAH68/s8+JtR8Z/Av4f69q9x9r1TUtBsry6nIwZJJIVZm/Ek16HXlX7KP8AybJ8Kv8AsWNO/wDSdK9VoAjFDfdNFDfdNMZ/P/4N/wCUjFr/ANj9N/6VvX6Of8FhP+TU4f8AsN2v8nr84vBv/KRi1/7H6b/0rev0d/4LC/8AJqcH/Yctv5PTBn4hvjccVp+E/wDkatF/6/Yf/RgrOZdzGtTwrHt8VaL/ANfsP/oYpiP3s/bx/wCTGfGn/YHi/wDZK+Jv+CJ//JTPiN/2C4f/AEbX2z+3h/yYz4z/AOwND/7JXxN/wRP/AOSmfEb/ALBcP/o2p6Afrsy5X3FfmXrP/BKfxlqX7Qtx8QI/GWiCwk1tdU+yNBKJNokD7d2MZ4r9NGfavJAznGa/JbXP+CmHxisf2np/Akb6KNATxANOC/YP33lmQL97d70gP0N/ac/aE0z9mP4XTeNdW0u61iziuIoGt7MqHy5Cgjdivxp/b4/bD0X9rrxB4Vv9F0O/0SPSLeaKRL9kZpC7KcjYe239a/an46fAnw3+0b8Pz4S8XNeHS5JEuJBZS+U29Rxg4PrXzOf+CP8A8B+hPiIZ9NRA/wDZaAO//wCCbcwg/Yz8DOeixXDcf9dWr5M/ao/4Kl+EviF8OfH3w2t/BWs2moXaTaYl9LcRGIOrlS+0c4+X9a4b4zfth/EH9iXx9qvwb+HL6YPB2g4SzGq2oubjEg3tufcM8t6V8ofALwbY/Hv9o7w3onibzRZ+INTJvDbN5bZkZmbb1wMmgDv/ANg/9rTRf2TPHmv69rGh3muQ6jYi0WGxZFZCHDZJcgdQK+pfHnwdvf8AgrNqUPxL8HX0Hgix0WL+x5LLXFaSSQgmTcpjJXGWP5ivdv8Ah0D8Blxvk8Qr9dTH/wARX0V+zn+zX4Q/Zi8J3/h/wa96+n3l19qk+2zCVt+wL1AHYCgD+ef4xfDW5+D/AMS/EPg29u4b680a7e0lnt87HZccjIrja9y/bd/5Oy+KH/YYk/8AQVq9+w78FfDX7QH7QWkeDPFbXCaRd21xK7WswicFE3DBwfSgD7P/AOCIq/vPil/u2X/tWvm//gqx/wAnk+Jv+vW1/wDRQr6T/aQt/wDh1t/YUnwTkLnxd5i6k2uAXmfJ2mPbwMcu2fXj0rsfgh+y54K/4KDeAbX4x/FU36+MNTke2m/su5+zweXEdqbUwccUAfnP+xT/AMnX/C7/ALDcP9a/av8Abo/Zf1b9q74X6b4W0jWLPRp7a+W8Mt6rMjADGPlBPeuN+Hf/AAS/+C/wt8caL4r0VtaOq6TcLc2/n34dN69Mrt5FbP8AwUM/aO8WfszfCHTfEng9bI6jcagts/26DzV24JOBkfnQB8v+Afitaf8ABJnT5/h540sZvGt/rkv9rJd6ERHEi42bcSYOeB0r8/8A4ofEix+Ln7Rt14v06ymsLXVtajuVt5yC65kXrgmpP2jf2l/GH7T3iaw1zxj9h+3WNubWE2NuYU8vOeRk5PvX6HfAL/gnL8IfFnwB8OfEO/GsjXpNN/tL93fARecgLD5dvTIFAH0N+37/AMmMeJf+wfbH/wBBr8kf2Rf2Pdb/AGuNW13T9F1ux0STSollklv1dlYNkADaCev86+lvhb+1h47/AGvvida/Avx0dPHgbVZJLOUWNqYrny48qmJMnnA9K/Qz9nH9jH4e/stalql54KOqCXU0WKcahdCUbRyMYVcd/wBKALX7Gf7P+pfsz/BWz8EarqlrrF5BcyztdWalYzvxwNwB4x3r3WofkjPzMB9cU4TRt0dT+IoA+Iv+CwB/4xLl/wCwva/+h15t/wAETz/xbL4hf9hK3/8ARbV6R/wWA/5NLk/7DFp/6HXm/wDwRP8A+SZ/EP8A7CUH/otqAPiD/gpZ/wAnnfEH/rtD/wCilr5gr6i/4KURvJ+2d8QtqM376H7oJ/5ZLXzH9nl/55Sf98mgD9H/APgiaP8Ai7XxD/7AUX/pQtcV/wAFjuP2pNP/AOwDb/8AoySu3/4IoqY/i18Q9wK/8SKLqCP+Xha4j/gsd/ydJp//AGAbf/0ZJQB+sf7KP/Jsnwq/7FjTv/SdK9Vryr9lH/k2T4Vf9ixp3/pOleq0AMH3RRR/CKDzQM/ny0jWrDw7/wAFAG1PVL2HTtPtPHU809zcNtjjQXb5LH0r9lte/ao/Z38SWqWmtfEHwbqVuQJFhvriKVOehww9q/Pv4rf8Ekfiv47+JnivxFZ63oMdrqmq3V7Es8rhgskrOM4B5+auU/4cy/GH/oPeG/8Av/J/8TVAfof/AMLm/ZO5xr/w1/792p/9lpy/Gr9lOF0dPEHw3V1O5WWO1BBHcfLX53f8OZfjD/0HvDf/AH/k/wDiaP8AhzL8Yf8AoPeG/wDv/J/8TQI+xP24f2mPhL40/ZX8daB4c8f+H9U1S5shFbWNndozuQwO1QD6Cvmr/gif8vxL+IuSONLhPXt5xrkP+HMnxhP/ADHvDX/f+T/4mvrv/gnn+w742/ZP8XeLNU8V6hpd7Bq1hFbQLp8jMQyyFjuyB2P86APkX/grD8QPFHhn9qIWmk+IdV0y2/se2fyLW7eNNx3c7VI/WvC/hL+z/wDFePx14U8can4L19tCW+t7+fWbi2dofJWRS0rSemB1r1f/AIK8f8nYk54/se1Jx/wOvb9H/wCCofw0039m+HwBJpOttqY0FtNMqxp5XmFCufpk1IH6GeC/2hvhn8Q9YGjeGfG+ia5qoDH7JY3aySgLgHjtjIr88/8Agsp408Q+F/Gvw5i0XXL/AEmOaxumkWyuXhD4kTBODzj+teCf8EmGDfteafj/AKB13z/wA169/wAFuP8AkePhh/2Drr/0YlAHxb4f+Avxi+KNtaeKrTwd4l8SWF0+Rqwt5Jlk28nLnjAFftT8HfiD8BZI/COi6fqfgxfGUdtBB9jgjgF4l0IgrLx83mA5/WqX/BOc/wDGFvhD/r2uP/Q3r8of2Yf+UgXhz/sbp/8A0dJQB9+/8FiPFGs+Ffg/4On0XVLzSppNWZJJLOZ4mZfK6EqR3rQ/4JA+KNY8WfAXxPPrGqXmqzx60Ujku7h5WVfKU4BYnvXpH/BQj9lbxP8AtW/D3w3oXhe9sbK607UGu5XvnZVZCm3AwDzn+VW/+Cf/AOy/4l/ZV+Fut+HPE95Y3t3eaibuJ7J2ZVXYFwcgen60AWfjF8QPgDJZ+LNGvdW8EnxlLbTwG1mSB7xrlomVFxjO8sVx71+Kev8AwV+L3wdt5PE974R8TeErSBgn9qGKSAR7skDzBjGcdj6V94fHD/gm/wDETVPj14l+KsWp6ONCi1T+2zAzkTGGIiRgox97Cmun+LH7Vnhf/gol4Ln+CPw+s7/TfE+rOt3Fc6sipbhYDvfkHPagDmv+CRu74sN8RY/Gh/4S1bRbX7Ouuj7YId3mbynmE43fLn/dHpXg3/BR/wAUav4E/as8RaN4X1e/8P6TDbWpSx0m5kt4FYxjdhEOAc1758Fo2/4JQyapN8VSNYHjEKlj/YO6QR+RkvuLdM71xj0NfE37anx00b9on4/av410C2uLXS7yCGJIroDflEAPH1oA9c/Zx8K/HPwf8YvAni3xjb+NNO8DWl9HeX+qanPOLKO2GcySEnGz619df8FG/Gmh/tQfCDSfCvwm1a3+IHiGHU1uZ9L8PyC4nSMKQXYDkAGvPfil/wAFPfhp44/Zs1b4f2mk61HrF3oi6ak8sS+WsgRVLH2yD+dfJ/7Av7THhv8AZd+LmoeJ/E9ne3ljPpz2qLYIC4YkEdSOOKAPsb/gn/o/gX4BfDnXtI+O+naH4Q8Q3Woia0t/F1tEkzwbPvL5nOM/0r5/+L3gX4z+IvjprmveBNP8WXfw1k1RZ7S50VphpxtAwLFApC7cA5xkY61xX/BQL9qDwv8AtUfEfRPEPhmyvrO1tLAWrpfoA5beTxgmvq34Ef8ABTL4a+DvgP4Y+HFzpGtNq0Onf2X5yRr5O99yA53Zxlh2oA+yfhZ8RvgNqWq6LpvhzVPBk3i3yI1SCwSD7X5m0BhlQDkNnPfNfLX/AAWU8Waz4V8M/D2TRdWvdJaa6nWV7G4aFmUJkAkEev615P4A/ZC8W/sZ+NrT4/eL7zTdR8KaTI19La2DMbnbLnbxtxnB9a8//wCCiH7a/gr9q/w/4Ss/C1jqllPpU8ks39oRqqsHUAbSCemO+OtAHh3g/wAI/tD/ABG0dNX8MQePNc0uRiq3dnc3LxFh1Gd2PWrPwS8dfELSf2hvB2i614k8Q291HrdvBc2d5fzHafMGVZS1fVn7FH/BRj4efs7fAiw8G+INO1afUrW4mm32kQKMHPHJPBx/OvlHwv4xtPiF+2npPiSwWVLPVPFMdzCs33wjSgjPvQB+o3/BXsFP2SZBk8avadef4jzXgP8AwST+Nnw/+FPw+8bW3i/xhpPhy5utQheCK/uBE7qEYEjP4fmK+1P28v2ede/aZ+Br+D/Dt1Z2moG+huhJfMVjwh9QD61+cTf8EaPjD93+3/DZAOR+/f8A+JoA/RzVfjv+y9rmoTXupeK/h/f3chy01w0Du31Yjmqn/C4P2T/+g/8ADn8rf/CvzvH/AARl+MP/AEHfDf8A3+f/AOJpf+HMnxh/6Dvhv/v8/wD8TQB+kWg/tG/s1+E5ZZdE8beB9IeYCOV7GeKIuM5AO0c/jX5U/wDBVD4ieGfib+0XYav4U16x8Q6YNEt4TdafMJEDh3yuR6ZFdp/w5k+MP/Qe8N/9/n/+Jpf+HM/xhXH/ABPvDf8A3+f/AOJoA/VL9lH/AJNl+FX/AGLGnf8ApOlerVwvwP8ABd78Ofg74J8LalJHLqGjaPa2Fw8RyjPHEqsR7ZBruqAGrQ3WkjUdRQ5xQAUV84/tQftG+DNJ+CvxCtdG8f6Ta+J7fTZ47eK3v0FxHcBeABnINfA3/BLX44eP/H/7TE+l+JPF2ra1p40e4mFte3LSJvDIFbH4n86dh2P2Hr8tf2u/+CmnxO+BPx+8T+CtA0/RptM02RUje7gLSHKg8kEetfo34s+LHg7wDdQWviTxNpeh3MyeZHFf3KxM69MjJrk7j4SfB34teZ4wm8M+GvEy3g8xtYMEcwlAH3i/fFMZ+Vn/AA+S+M//AECvDn/gK3/xVH/D5L4z/wDQL8O/+Arf/FV+hsmhfslW8rxzQfDqKRCVZWkgBBHBBya3fCHwp/Zr8fXNxB4Z8P8AgnXJ4E3yx6ckUrIp6E7Tx0P5GgR8nfBv9njw9/wU38Hf8Lc+Jd3faX4lWd9LaHRXEduYosbCA2eeTXd/8OZfg5/0HPEn/gQn/wATX274N8E6B4B0j+y/Dek2ujabvMgtrOMIm49TgVqahqFtpdnLd3c6W1tCpeSaRtqoo6kntSA/Nj4vfsxeGf8Agmv4Qf4y/De9vtS8S2sq6esGssJIDHNw+QoHPFfn9+1J+1l4v/aq1LQr/wAW21hbzaTDJDALCMoCrkE5z7qK/Sv/AIKh/GTwL44/Zd1DTPD/AIt0jWdR/tC3Y2tldpJLtD8naDnA718/f8Etofg3deGPHafE0eGWvjeW32QeIGQZTY24rv7Zx+lFgsfcH/BOT5v2KfB5/wCne4H/AI+1flF+zD/ykC8N/wDY3T/+jpK6L9rb476x4N/aI8Q6N8MfGdxpXgeGWNbWz0K8xZgMgDhQny4r9RPgvB+zzeW3hC90tvBk/jF7a3ZZoWhN210YgWJI+bfnOaLBY+mm6e9fn5/wUF/b28ffsr/FDRPDfhSw0m6s73S1vJX1CFnbfvZeMMPSv0COeSR+tfkr/wAFcPhN408efHbw3eeHPC2qa5aR6IsbzWFq0qq3mvwcDj/61IRx2kf8FZfi18QtStPC2p6P4fXTtalXTbhre3dZRHMfLYqS/XDGvub4Af8ABOb4dfs+/EbT/HHh7UNam1W1idFiu51MREihWBGBjn61+Qnw6/Z4+J9j8RPDFzcfD/xDFBFqdq8jNp8gAUSqSTx0wDX9F0f/AB7r7qMf59aAPCf2ov2N/Bv7WEehJ4svtRtV0bzDb/2fIE3F8Alsg5+6MfjXgcn/AARx+DioSmreIi6/d3TqRxk/3fWoP+CqN38V7Nfh8fhj/wAJCHJuhfNoAcn+DZv2/wDA8Z96/MjxT8efjv4T1V9O1zxp4t0vUYwC1tc3ssbqDnGRmgCn8L/hJpPjP9prSvh5ey3Eek3euNpjSxkCQIGIznHXgV9W/t+/sC/D/wDZg+EOneJfC+oarc39xfpbOt7IGj2kHJ6cGvHf2S/g38Sbf9pn4e+I9U8G68lodXjupr25spAhVskuzEcg561+6fjT4feHPiJpcVh4l0Wz1yyRxKlveRB0D4IyARxwTQB/MRGoKqe34V+sP7NH/BMP4ZfEL4S+CPG2oaprkWqX1tFfSRwzqI94OcYx04FeD/8ABWn4c+Gfhv8AGHwvZeF9CsNCs5dJ8x4dPhEasfMIBIA5PHX3r5Z0X9oz4o+GtLt9N0rx1rWn2Fuu2K3guSiqPYCgD9sf+Ci1mmm/sYeMbNN3lRWsMK7uuFIAz+VfmV/wTv8A2SfCf7VniLxVYeK7q/trfS7eKWL7A4UsWZgckg/3R+teGzfGD4u/FpP+EYl8U+IPEq3hx/ZvnvJ5mAf4R1r9Cf8AgkH8NPF3w/8AFnjo+I/DepaFFPawCJr23aIMQ5zgt17dPWgD4l/bc+A+g/s6fHa/8H+HJrq50uC3ikSS7kDvuYcjIX2r9Dv2Zv8AgmR8M5vDfw9+Ix1PWP7YMMGqGIyr5PmcMBjHrX2n4t+BPw+8daw2q+IPB2kavqUigNc3lsHcgdOcV5z8bvjn8O/A3we8X6LofjbQ9H1bT9Lnt7Sytr1EkgkVDtVVByDnFAFX9vP9obxF+zL8D38X+GbezutR+3Q23l30ZZNrtgngivzib/gsh8ZmbJ0jw4Vz/wA+zdOn96sv9g740z/Er46LpHxl8Xf254Q+wTy/ZfE94HtTOPuHD8bsniul/wCCjHwj0Dxp4z8K3HwO8M2us6TDYyrqDeFLYSxJKXXaJCgIBIBx9DQB+m/7Ifxe1j47fALwz411+K1g1PUo3aSO0QrGMOy8ZJ9K9mbpXzN+wb4c1jwn+x74T0vVbC60vVre2uQbeZCkqtvfHHXPpXwR+yRqf7RMn7WfhOLxZN40PhYapL9pXUPO+y+XtfGc/Lj0oA+1f+Ci37Vniz9lLwP4S1nwnbWFzdapqMlrMt+hddqxFhjBHOa6P9gP9o7xJ+098Gbzxb4pt7G21GPU5bNVsYyi7FVWXOSefnr0z42Q/DCfSNM/4WgNCNgs7GzGulAnm7OSm7vtz09q57wb8WvgN8O9HfTvDfivwhoWneaZGt7K9ijQucZOAevSgD22lqlpOqWmtWMF7Y3MV7ZzoJIriBwyOp6EEdau0AMHQUH3o9KRulMD8UP2lv8Agm78VtL1z4jfEeaTSP7AS8u9W/4+/wB75TSFx8v0NeSfsD/tA+GP2afjhJ4u8VJePpp0yazAsU3tucoRx6fKa9//AGmv+CoHjbVLv4j/AAzl8K6Oulm4vNGN4JJPN8tZGTcO2eK/OpqaKP0//aK8C6l/wVI8QaX4y+DvlJpnhq1Ok3q60xtX85nMo2g9RtYZ/CvuH9nX4U618D/2S7LwZ4gNv/a2l6VdLN9mfcmSrng9+tfL3/BFLJ+EHxCHO06+gJH/AF7pWF+2B/wUy8bfBn4yeMPh5p3hzSLvT7RfswuZnfzCHj5P15oA/OHwR8K9Z+NXxoTwZoBt/wC1tU1CaC3+0ybE3bmPJ+gr79/Z38JXn/BLXWNW8TfGJY303xTAunWP9iH7Swljbe27/gP9a+A/g78aNS+Dvxi0v4hafaW93qNjdPdpbzE+WWbOR9Oa9W/au/bp8TftbeH9E03X9C07R00m5e6iaxdzuLIVIOaYH7cfs9ftBeGv2k/AbeLPCq3a6YLqS0/0yLy33pjPHpyK6X4o+Hbrxd8O/EmiWOz7ZqOnz2sXmnC7nQqM/nX4hfsy/wDBRzxf+y/8Nz4O0Tw3peqWX2uW78+8dw+58ZHy9uK9a/4fU/Ef/oSdA/7+y0gPCvj5/wAE+Pid+zv4Bn8Y+KG0v+yIpo4D9lud77nOBx26Vz/7Nf7Ffj79qjTdYvvB8mmxw6XJHFP9un8s5cMVxwf7pr638BftSa7/AMFMvECfBbxnpdn4Z0K7jbUHvdILPP5kPKAb+McnNfc37J37IPh/9kfS/EGn6DrN9rMesSxzSyXyqGQorAAY4x81MZ+ZB/4I9/HH+Gfw/j/r+P8A8TXSfDj9gn4k/si+ONH+L/jaTSpPC3hOcalqAsLkyzeUvXauBk17N+1j/wAFQPG/7Pvx48R+CNJ8MaPqNhprRrHPdSOJDlc84+teb+E/+ChfjD9szxFYfBjxD4f0rRdG8YyDS7m9sWd5o0fqVDd+KQj6R/4fBfA1efJ8Qc9vsP8A9lR/w+F+Bo/5Y+IP/AH/AOvXxd+3z+wT4X/ZL8BeHNd0HxDqWsT6lftZyR30aqFURlgRt78d/Srv7B3/AAT/APCX7WPw11nxJrviDUtJubHUjZpFZorKy7FbJz7mgD7R0P8A4K1fBXxJrWn6Zaxa6Lm8uI7ePzLLA3OwUZOfevteNhIob1Ga/OTVP+CR/gT4Z6fP4t07xfrNze6Eh1SKGeJAkjQjzApx2JWnfsc/8FJvGf7RHx20nwNqvhrTNP067t55GurZ28zKKWBI6UAfo2VBr8v/ANt//gnf8UP2hP2hNZ8Z+G30pNKure3iRbq62PlEAPGPpX6gIdwp1AGJ4H0mbQfB2iabcbfPs7KG3k29NyIFOPxFcF+0d+0h4W/Zj8HWviTxYl49jcXAtkFnF5jbiCema2Pj98RLz4S/Bvxb4wsLeK6u9HsXuo4ZiQjlexxX5ufDf41ar/wVS1qX4XeO7O38K6ZpsR1eO70bLyl1IXad/A4NAEf7Qnw11b/gqB4ksfHnwgMMei6Hbf2Xdf20/wBmczZ3/KOc8H+XrX58+O/hXq/w8+JF74J1NoDrFneCykaJ8x7y2PvY9xX6H/Er4pXv/BJ/VLf4f+BLaDxdp+vRf2tLc6zlJEfJTA2cHp+lfnz8R/i1qHxJ+Kuo+Pb20hgv7y/F9JbRE+UGDA4+nFMD7R+C/wCyD46/Yx8XaL8bfHgsm8IaGourgWE3mz7XAxhfoa+rG/4LBfA5Sf3PiDOcf8eH/wBlXwr8aP8Agpv4y+NHwe1D4e6l4X0mz069t47d7mCR/MATGCB/wEVjfsB/sgaB+1t4i8TWGv6zf6RDpVvHJG1iqkuzEg53emP1oA/QP/h8F8DW/wCWPiAY/wCnD2+tfkp42dfjt+0Fqp8OnaPEutsLL7T+7/1smF3dcda/T7/hy18OAvHjXXmPoY48V+dPg7wbb/D/APbI0Pw7aTNc2mm+KorWOaT7zBZlHNIDpP2gv+CfvxM/Zs+H7+LvFb6U2lC5jtD9jufMfe+ccY9q9e/4Jz/tq/D79lvwd4p07xf/AGkbrVLyKeH+z7bzBhVYHP5iv1L/AGnP2c9H/ae+G48Ha5qF1ptibpLrzrQAsGQHHB+tfIf/AA5b+HUcn/I8a+R1/wBXECKYH258Jfi/onxo+GWm+OdBE39j6hC0sQuY9j4UkHI/CvB/hT/wUm+FPxe+KGl+BNDTWF1rUblraE3NpsjLKGJyf+A17X8EvgrYfA74Q6b4B0y/nvrLT4pIYrq5QByGLEZA44zj8K+cfg5/wS/8E/Bf4xaN8QtL8U6xe32mXUl1HaXUcewllYYJHP8AFSA8z/4LafN8Jfhx/wBhub/0RX5BL/rk+or+ib9rb9kjQ/2t/C+h6LrmsXujw6VdtdxPZhSWYoVwcjsP5mvl8/8ABFT4e7ht8b68uPWKP1qST7F/ZP8A+TY/hV/2LWn/APpOles1zHwz8EQfDT4f+HPCdrcSXdrolhDp8M0v33SJAik++BXT0ANWhutJH0obvQB/NP8AHuxuNS/aE+IdvaW8t1cSeIr4JFChdmP2h+ABzWCvwp8bMBjwdrxHtpc//wARX2t4Y/ZD+L9v+2/F4qn8A6pH4bbxhNetqDIPJ8lrh2DFvTBFfswljbL0giGeeEFUUfzsfDHxl8fvgzp91p/gl/GPhi2vZhLLDZWMyCaTGM8p6D9K/Vr9lr9nTwJ8bfgP4b8b/F3wRZ+IPHGpRPNqOq67bsLmYhiAz5x2A/Kvs1rW3VhiGPP+4K8Q+Kf7Vnwj8HXWueEdY8cabpviWO3kgOnSbhKHdCqj7uMknHXvQByc37Mn7JcbMknhfwEjKcMrXMWQfQ/PXxj/AMFKPgL8MdB8E+D5fgt4W0mTUpNQmXUF8LoLmXyvLGzeI9xA3Z9O9fL+rfsPftAaxqd1eWnw31ye0lmeSGSPaVKMxYEfN0IOfxr6n/4J8+H9Q/Yu8W+K9Y+OlnL8PdL1myitdOudawEuJVcs6LjPIBH5igD0T/gnD+yH8PPHv7Pr6h8RPhva3uvjVJ0E2sWbJMYgF28MAcZzXvPxg/Yj+BmgfCvxbqOn/DXQ7O9tdLuJoZ4oMOjLGSCPyrpo/wBvj9nyHIX4l6Mv/A2/wrlPi9+3J8CvEnwt8WaZp/xG0m5vrvS7mCCGNzud2iYKBketAH5x/wDBJ/B/a+sWVdimwuiFXt8vSvrP/gqV8TvjB8PfFHgKL4Y6j4g0+2mtLh7xtCiaTdIGQJu2qSMLux06mviP/gnH8T/DHwl/aYsde8Xazb6HoqWNyjXlwSEDEDA6d+a/W5v29P2e5sN/ws3RX29izH+YpjPDP2c/hn8Ifi18EdI8TfGTTPD+r/EW/hl/tG78RTIl+2HbZvRmDZxjHFfkjqniO++Hfxb1fVvC14dJu9N1a4awuLRsGJVlYLtPYYr6v/a0+A/xF/aK+OXiXx/8MfC9/wCKfAuqsr2mraeP9GkCp85HzdiG/OvjrQfAev8AijxjB4W03TprrxBcXBtY7JR85kyQV/SgDufGfxp+L37Q1nDpPiPX9f8AG8FixuI7Vla58liMFwqg4+tfpz/wSa1K0+G3wT8S2Hi65g8L38usl1ttYlFrI6+Wo3hZMcduPSvFv+Cfvg/U/wBjH4geI/Enxw09/AGhapp62dleawu2OWcSBiq4B5C5/OvK/wDgqN8YPBvxe+Mvh/U/AviG313TbfSBBJJYn5Ek8xmx0HOD+lAj9l9Q+I3gHVrGezuvFWgzW0yGOSNtRhIZSMEfe968t8B/Cv8AZw+F/iS38QeFbXwboetW6skV5Z3kIkVWUqwzu7g1+KOj/sj/ABp8Q+DoPFemeCdYudAuLY3kd/GMI0PJ39enWuB8BfD/AMW/E3xNH4d8K6ffaxrcoYpY2py7Bfvd+1Az9S/+Cp/7T3iT4dx+AG+GHxBbTvtJuxef2Jeo+/Hl7d20nplsfU18BN+3Z8f5mQJ8U/EOeFAW45PoOlWZf2Cf2h7jG/4Y664XpuUHH5tTF/YF/aAhO5/hdrW0cksi4H156f4UCPUfgf8AHL47/ET4qeFNF+I/iDxVqXgDU7xINXt9YikWxmtWB3CUlNuzjua/WD4Q/B34HeAfEE1/8N9I8MafrbRNDNJos8bylM5KkK3T8K+evjl+1T8Ibj9kvxJ4OtvG+lf8JUvh9bH+zVbEqzoiqU6dQRivkj/gjvdv/wANG62HdmH9jOBuOQPnFIZ13/BYXwfr3iD41eEptK0PUtSgj0cqz2VpJMinzGOCVXjr6+tfRH7Mf7OP7Omp/A3wY/i/wt4SHiiWyQ3q6hLHHctKSeGVn3Z+or6f+KX7Rnwt+D2s2umeOfFem+H764i82GK/bBZMkZHHqDX4TftEeOtJ8S/tWeIvEGi6rHd6DPrq3MF5C58ry965I9sA0CP2jvv2Kf2cdNsTe3fw48L2loMN9pnjVI8HodxOK2/hj4T+AvwaubybwM/hDw5PeKqz/Yb+FPMC5x/H23Hp6189/tIftAfD79oj9m7Ufhz8N/FNp4p8b6hZww2ui6cxNxMyhdyjjt/Svyg+Kn7P/wATfgvbWk3jjw1qPh2K7Yi3N4cea3GSOfp+lAH2B/wUH/bA+Jngf9ozUtM8B/Em+sfD620TxQ6Tdhogxzk5BPpX1lZ/AH4dN+y3H8Uj4S07/hP28PnWP7eMWbn7Xs3Cbd/ezjmvxBlZ2bDsWPbJr9r/AA5+1F8K/Ef7INj4A0/xtpd34zvPDf8AZtvo8TlppLloyoiAx1zTA+bP+Ccv7XnxE8eftDRaZ8RPiRfX/h86dcSNHq94qw7gvynLEDrivTv+Clnx6+JeheOPCEXwa8V6u+myWUpvv+EYdriPzQ67dxj3AHGf1r4U/wCGBf2hAxH/AAq3XMDjO1B/7NX3X+wBr2nfsb+D/E+j/HK8j8A6nq93HcWFvrfD3EaqwZlxu45Hp2oA+FNU/ba/aK0q9kttQ+Jfia1ukOGhuJSjr9QQKXTP23P2idVvI7Ww+JPie8upDhIbeUyO30AGa9d/a4/Z78f/ALRHx38V/ET4beF73xX4J1RkmstasY8w3CrGquy8Doyt+leYf8E+7d7X9sz4bJINrLqToR7iN6AHa1+2H+094dhSbVvHfjDS4pOEa8DwhvpuUZ/+uKyG/bw/aAbr8VfEI9hc19+/8FrERfhL8OtqKD/bk2Soxn/RzX5DyfeH0oA/pZ/Zt17UPFHwC+HWsatdPe6lf6BZXNzcSHLSSPCrMxPfJNelV5T+yj/ybL8Kv+xY07/0nSvVqgkjXpS5pFpazuB+d/jj/gsN4P8AAHjjxB4cm8Aa1dTaTf3FlJOl1EFdo5GUkDtyDWKf+C23gzqPh1rn/gVF/jXwHfeB7L4mftvat4U1JpY7DWPGl1ZzNAcOFa6kBwa+oP29f+Ce/wAOv2Y/givi/wAL3usXOpHUYLLbfSq8YDhiTwowfl960uB+g/7IP7W+lftd+Etc17SNDu9Cg0u8WyeK8lR2dim/Pynjgj86/I39vj/k/PxN/wBhS1/9kr7T/wCCJqj/AIUz8QyOn9vR/wDpMlfFf7fP/J+nif8A7Ctr/wCyVVyj9oPi18XrT4E/Ai78cX1jLqVrpOnxSyW0LBXcbQMAmvgHxh42j/4K7Q23hbwraN4En8JudRludZZZ1lWT5AqiPnIwfzFfoT8RvhXpPxr+C83gzXJLiLS9UsYopntmw4G1TxX5/wDx08G2f/BKbS9K8S/Ch59Sv/FUradejX2WaNUjHmAoAFwc/XtQgPgn9qr9m3U/2WvicPBuq6xba3cfZI7sXVojIm184XDc5GK818G+G5fGHinStDhmjt5tQuY7VJZfuqzsFBPPqRX6rfBn9nnw3/wUy8Gr8XfibcXeneJfPfS2h0KQR2/lxAbTg5+Yg816f4W/4JH/AAg8H+JNM1q01PxBLc2FxHdRLNcrtLIwZc4A4yBTA+aP+HKXjZuvxF0Vuf8An0lH9ad/w5T8aJwPiJovzcHNpJX65FcD19a+GP8Agop+2x45/ZR8SeEbDwnZ6Xdw6tbTzTnUIS5BRkAxgj+8f0pAeXaH+21on7Augj4Fa/4avvE+reHAySatYSoltIZQXHyt8wPzfrX57/C3402Xw/8A2kdL+JU2mzXNlZa0+qmwiZVdlLE7Nx6cH9KwPjh8YtZ+PHxI1Xxpr8FrBquoMpmWzQrH8qgDAJPpXBr94UwP3Ssr3wB/wUX+BuleKvFvhfU7DQ9P1CZrPT/toV55UXax3L2r51+Onwh/Z3+CflIfg/Lq5kh+0lzrsseMfLtx06k17x/wTDYL+xn4eJ/6Cd8P/H1rwb/gpHqCaXqMcad7VlP4N/8AXrzK1aUajijenTdQd4T/AOCn+gaL4csfhzpfwseHQIrf+zFtzq5OyNgVK5wc8MfSvWfgp4N+CHwpkX4keEfAX9ka3a27qsh1V3EYcYYtlsAYz2r8z/2fPAEvjvxUjQkeZCwkXccKTycH/vmv0S+H/hW+8N+D5h4iEF5bThoZ7eGPaGiP8IHc4zXBiMTOM1FM93CZeq1Ns+kv2e/2r7f42zeJ7G40X+xtT0GZUlhW6EySRMCUdSBxkLXrl54uEbCL7IZNwIOJPbGOnevmTwDZ6f4P+Ieh6jpGmpp8GrWP9mXkQUB2C/NCzY9Bu/OvatZePy0+fDMTz6jjB/WumOJlPVM8nEYf2M7HhurfsH/s861qF7fXHgXfc3EzzSSJqMqgsxLHgHjrWr8N/wBn34Xfs13XiH4ieBPCt9ZarZ6XNv0+K+ZkuI0G4j5+h4zxXpUlq9rb53538isnV2dfCPjF2+6NBvv0hY1vCpJvVnJY/H/9ur9qrTP2r/iFoniDS9Fu9Eh02wNm8V3Krl23liwI7dfyr1/4P/8ABJTxb8X/AIa6B4xtvHWkafbavbC5itpbWVnRT0BNT/8ABP8A/YT8B/tVfDzxDr3inUNWtr2x1L7JGtjIqJt2Bu45PNfrJ4P8EWfwT+E1v4f0SSSez0LT2S2a6OSQikjdjHeu1MVj4b/Zf/4JaeKP2ffjZ4f8b3vjXStVtdNdmktYLeRXcHAwCeK9x/bx/Y11f9rjSfDVppPiCz0N9KleR3vImffuwBjb06V8G65/wWA+MdjrV/bR6X4eMcM8kS7rZicBiB39q+tf+Cd37bHjj9qzxD4usPFlnpltBpdtFPCbCFkYlmIIPJ9BVhY+cz/wRR8YLsLfELR5NxxhbWQHoT3r5E+F/g2X4e/tb+GvDc9wl3NpniOG2aaMYVysgGRX6D/tvf8ABRb4kfs5/HbUPBvh/TtHm0uG0hmia7hZ5CXHfkYxg/nVsfsVeB5/hn/w0SbzVP8AhNDYHxObdZVFoboLv27dudue2eaoLH6RL92vyC/4LYf8lQ+H3/YMn/8ARi1yX/D5H4zL/wAwjw3z/wBOr5/9D6186/tPftYeLP2rdc0bVfFdrp9rPplu8EK6dGyKQzZJOWPPApCsfsf/AME5rdrz9iPwJAjbGls7hAxGQCZXANeAfs8/8Es/E/wY+P3hv4g3njPS7+00u+e7ayit5RIysrALk8fxV8gfBP8A4KafE74D/DXR/BWhadotzpmmKyQyXkDNIQzFuSCP71fSP7Kv/BTz4n/HD9oDwd4L1vTdDt9M1a6ME0lpAyyBdhbgkn+7QFj6s/bv/ZD1X9rjwb4Z0XStctNDk0m+e7eS8iZ9+Y9uBtr4uf8A4IoeL+AfiLo2e3+iy8c1+upYY61+dH7fX/BQD4g/sx/GyDwn4XstJuNOk02G8Zr6Eu+9iwPIPtTA+6Pg34JuPhr8J/CHhO7uI7u50PSrbTpLiEEJI0UaoWAPIB25/GuyrhPgb4yvfiJ8H/BfirUkjj1HWtItb+4SHIQPJErHaCeBzXd0hNDVp3Y0AcUdK5yT+fn4vfs5/GhPjz431zQfAfikFtfvbi1vrGylzgzuQysBXI/F3TPj7Z+FVk+JUXjNPD/nqB/wkBn+z+bg7cbzjOM1/QZ8TvH1n8L/AAFrvivUIZbiz0m0ku5YoAN7Ko5AzX5Mft1f8FEfA37UHwT/AOEP8PaFrOnagNRhvPOvhH5e1AwK/KxOeR6d6q4Hw34R+KHjPwDY3Fv4b8S6toNnPJumTT7p4VkcADJ29TgV3vhX4Q/F/wCK2uaP4xPhTxH4mtrq7ikOtNBLOJQrjLF/YCuy/ZZ/YR8YftaeGda1nw1rWk6Xb6XeLZyrqBfc7FA2V2g8YIr7i+GP7Z3hX9h7R9H+A3ivStT1jxJoLCznv9NCfZWeRwVxuIPAYdqLgfU37WVr4pb9kvxNB4Sj1JfE/wDZUS20embhciQBcgbefWvjv/gnR8L/AIi+LfGXi6H47eGta1vS47GJtNi8YWzzxpN5h3GMS8Alev8AwGvvz4ufGnS/g78ItU+Iep2d1d6XYWiXb29sF80q23AGSB/FXx1/w+g+FkjDPhHxMvtiL/4uhMZ91+FPBuheB9MOn+H9ItNGsS5kNvZxCJNx74Hf/Cvw18aftAeOdD/bA1K1uPH2s2Wh2/inbJFNqUi28cImGQRnAGM1+xn7Nv7RWhftP/Dr/hMfDtjeafYi5ktjDfBQ+5cZPGfXtX54fF3/AIJH/Ez4ifE3xP4js/E/h+2s9S1Ca6iimaXcqsxPOF61pcZ9F/tufG6y+KXwLudE+C3jVfEHjSS6hZLPwte771ogfnI2Hdt9a/Lvxl8C/wBozx5eQy+JvCPjbXpoNyxNf200zKCRuA3c9QPyr61+Gf7L3iD/AIJo+KIvjR481Kx1/QbNGsXtNDDm5LS/KMbtq7fXOe1ey/8AD574UKOPCfiYD0KQ/ph6oBv7KOn/AAN+Hv7Peg6D8U7Lwho3jy1ik+32PiCCBb5GJIXeG+bkEYr80Pil+zn8Q9D1bxL4gHgbWLbwst5cXEN+LRhb/ZzIxRgRxjbjFfY3xC/Yw8Wft2eL7n45eDdW0vR/D/iIiW3sdWaQXC+V8jA7VI5KHHNbPx3/AOCkPgTXvgH4g+EcGg62utx6YNDa9Plm386JVRmB3BtpKHtTGe1f8E39csdB/Yr8Ny3syxvJq16kUbfxnep4rwH/AIKXWDeJLrSfEemQyvpMyNHcOjZCtjIH6Gj4G6u2mfsW/CpUWRll17UQwj9CVB/LH6179430u1sfhf8AZpLQ35v4Wtttwm4EEjgD15r5zFz5cRqd1HRM/LT4NfEiPwL46k1CaQRWEoWKWM9SpI5r9L9J8badr2gLHZ64LcTBXSSM/OoIHFfJfxS/4J969Noqa34NguppZF3y6beII2jXj7hPXPb6V7n+zH8KvGmj+DbWDxpoa2awYSDfKJJmUdAwHT2/Gs8TTjJKpDc93L8ROm3T7ntXw+8VeFPD+tWunf2mkmowt5spuX2yPn/9Rr1bUvi/4euhhmkLLkAxruB/GvKpPhX4e17x9qupaosljciwiFpfF9g3puymTxjkcH0rR0+Gx0/dFc21lqMilT9qWHaJRz82Bxn3HXFOlGyPPx8+eo3I9D0nx9pviyQ/YvMxbja3mDHXpj8q7jwu2mq11LqLRrYraSGczY2eXj5t2e23Oa+f/wDhNILG5lfT7OC0myVMkSYOK2fAkt7491LWdHFzi41DSLy1jMx+XdJEygn2Ga6YT9/lOV4eSjzM97+Dd98NL7RbxvhlLoMulLPi4/sDy/KEuO+zjOKpa/8AtHfCnR9YuNA1bx1oFtqCt5MthcXiCTJ42lc856V5X+wH+y34h/ZV+HviLw/4hv8AT9Rn1DU/tsUun78bfLC4bPfgdPevlD49f8ExPiH4s+NniX4j2ev6DHpUmof2qtsxcTeWmGK/dxnCnvXsKOh5l9T9Bk/Z5+FGp7bz/hX/AIbn88CQSHTYjuB5Bzt718ef8FE/g34o8I6H4Ul+A3hO90e/nuJl1B/BtqYZHUL8vmGMAkAk4+rV6B8Bf+CkngP4rfEXQ/hrpmg6zBq8i/ZBdTiMQFo12kj5s4yp7V9nKep6d6oo/nT8U/s5/tA+NNV/tTX/AAN4x1fUJVVDdX1pLLIQBhQWbnGMdfev3d+APhcx/s8+CtC17ThuTRobe7sbyPOCFAZHU9/WvFf2iv8AgpN4F/Zr+JNx4N17w9rV/fQwpMZrNU8shs9NxHpXmH/D6X4V/wDQo+Jfyh/+KoHqfYR/Zt+FP/ROvDP/AIK4c/8AoNflZ/wV+8A+G/AfxM8Bw+HND0/Q4rjTbhpI9PtkhV8SKATtAzjJ/M190fs0/wDBRjwR+1B8Rl8G+HtB1jTb820l1519s2bUGSPlJri/+Cgv7CvjD9rDxl4X1bwzrOl6ZDpdnLbzJqG8ElnVgRtB9D+lMEWP2Dfgj4B8W/sdeENT1LwXo2p6tNaXGbq4sY5JnbzJMc4znmvg39lL4O+NPg/+1R4Z8ZeMPCOp+FfB2m6lNJd61qNo8FpaxlXCsXIwBnAH1r6m8BftveEP2BvC9l8DvGOkarrniLwupiur3SRGbdzITKNu5gejjtXGftRf8FTPh58c/gP4u8DaR4c16y1DWLXyIri7EflqQwbna+eduPxpjPv5v2svgt3+J/hv/wAGEdfkT/wVT8feG/iN+0haap4W1yz1/Tho1vEbqxmWVN4ZsjI+oryn9lP9k/xF+1p4o1vRvDuqafpk2lWq3k0l/uwys+0AAA559favpT/hzD8VQw/4qrw2fq0v/wATQB+of7Kf/Jsvwq/7FnTv/SdK9WriPgp4JvPht8I/BnhXUJop73RdItdPmlgJ8tniiVGK55wSveu3pkjlpG9PWloPQ1k0QflF4u/4KBeM/jP8Zta+A+o6BpNl4d1vWJ/DNxqFv5hukgaRoy65O3dj1Br0lv8Agiz8Mm4/4TfxPnqCRB/8RX5m/FK61zT/ANqLxjd+GZLqLX4vFF41i1iCZhN9ofbsA713PiD9oj9qrwjYnUtZ8WfEDSbEt5f2m8M8MW70yRtzSsB+y/7J/wCyX4e/ZJ8L67onh3V9R1e31W8W9kfUdm5GCBABtA4wO9fj/wDt8f8AJ+Xir/sK2v8AJK4D/htz4+Dj/hbHigY/6fmr9Sv2Wvgt4G+Nn7LujfEfx74W03xZ48v7K4ubjxBqVuJLuSRCxRi/qNoI+lFrAfTvxQ+Eun/HT4IzeCNUvLixsNWsIYpZrXG8ABTxkH0r44b/AIIs/DHIB8b+Jic5zsgz+Py+1fnun7Wn7QV54kn0fQPiL4su28947W0sbh3JUHaqooGcAADj0r7+/wCCXvjT43eLvHvjRfiteeLLmwh0+L7EviKORIxJ5h3bd6jnGOntQkNH2F+zJ+znon7L/wAOW8H6DqN9qdibuS786/2eYC4GV+UAY4/WvW6YvA5z+Nfh74j/AGqPi/H+2BceHoviLryaIvilbYWAuj5XlmYDZt9MGrGfrd+0v+z3o37THwzn8G65qF5ptjJMk5nstpcFTkcEGvkB/wDgix8M1+X/AITrxKpP+xb/APxNexf8FLPiH4l+GP7MV7rfhXXbzQdWjvraNbyzkKSYLcjI9cV+UXhn9pb9qTxtDcTeH/GvjvXI4CFlfT2lnEec4DbQcZwcZ9DTQH0/48/bY8TfsE+J734IeE9B0vxD4f8ADrbLa/1YSi4kEg8wg7H28FsDA7V8U/BPwfbftDftFaHoOtXMunw+J9XY3M1pjenmOXbbu/Gn+Jvh38ZvH3ieTW/E/hXxdrGp3Dhp7290ydmYDqWYrgDHrX6c/Fbwz8A/hv8As03viTwPF4K0P4kafosUtrfafcwpqcN3sXOzBLCTdn0qhnRfED4AaV+zp8K/AvgXQ7y81Sws768nW4vdvmEyAMenvmvQPBPkX2paAl/+9S1WaaODdjLgDFfPnwf+IniL4h/sk+Adf8Vazd67rUmp34kvr+TfIyjbtBPXgV6B4P8AFSxX2kXskiyR298pMa98qBz+dfNYz/ebnpUbcp7T4guJdYgf7NpbH5v4Xzlj1H8qwYr240e8SO/sWteMAPyPz7Uz/hYNlF45XQU1KG4nJLSCM8J3Cj869N26brtl5E0aykcEN/j2o9tFaM1jRlLVHK3s1rqejyWZdZFfDAHkqexrzXVtPv8AbNCYhEyD9ztHBP8AeFem6h4P/s2+F1p7uEb5XtzypHqPp/WjWLG1utNeEK0EqrmOV+ocf49K3p1abRlUozk15Hyj40uNZ8L+G9X11htu7UBjauMkjJBcfp+dey/sd3Wm+LF0TxF9kni1W7tpBcwyOMQuM5wP89azfEt9beL9MF3botlfWzmC5tyMhgOCh/n+Ncv8GbnW/B2t+LNO02O4Ed7ot9Pp7RMd9vOkTHChQTnO3GPSs4Sj7S6HUnLk5WaH7e37fvi/9kr4jaF4d8P+H9H1a21DTvtrS6g0gYHeV42keh/KvmaH/gsV8SPFtxHok/g7w3FBqTizeSJpt6LIdpK5bGcGvjH45eIPiZ4j8S283xOuNeuNUjjK2za+kiy+TnPylwMiv1J/Z5+H37NE37MfhzUtb0/wGnjKPRWlluLueBLv7QEYhvmYHcDjpXvnlHcfAb/gmx4I+FfxK0L4m6d4l1u61eL/AEw2c6xGANIAxH3d2Bn1rc/4KA/tieI/2SdF8M3nh3SNP1eXVJpYpV1DftUKoII2sPevgj9j/wDa6+Id5+1NoOk+KviZqD+DVupont9Q1ACyWJdwQcnbgDpX6teIPDvwh/aMigstVj8M/ED7D+9SHzorryc/xbQ3Gdv6UFHxD4A/ZW0H/gpX4fT40+NtVv8Aw3rd7I1i1hom0wKsXyg/vAxyfwrpV/4Iq/DHv418UD6CD/4ivsPRdY+E/wACbFvC+n6n4Z8FW8J80aW15FbbS3UhCwP5V+Rl5+2D8TY/2vzp4+KOrjwePE/lCH+0f9E+z+bjr024NAz6H+JH7N2if8EvfDbfGbwHqd94n11ZF0oWOvbfs+ybgt+72nIx3ryn/h9P8UBk/wDCE+F39n+0Y/RxX0Z/wVY+J/hDxd+y7Jp+ieKdG1e/OrWsn2Wxv4ppNobk7VbNfkN4b+HvinxjDLNoHhvVtahhIWSTT7GWdUPOASinHQ/lTGfqb4H/AGG/Cn7fXhqz+Ofi7XtW0DxB4qUzXWn6SIzbxmMmIbd6lvuovU1vf8OU/hj/ANDv4o/75g/+Ir83vDP7Q/xo+EbWHhCLxp4l8K6fp8yodHad7dYFJyQyHGAQe9fr3+1l+0loekfsqeKr7wn8RdMj8Wx6ZC1q2narEbsSlkyQFOc4JzTEbX7KP7BfhL9kbxJrms+Hdf1bV59WtEtJU1IR7UVX35Xao5rxf9uj/god41/ZZ+M0PhHQPDmi6rZS6bDd+fqBk8xXZmBA2sBjjv61wn/BJf4+fET4vfFHx1ZeNPGGq+JrSz0eOa3i1CcyLE5nCllz0OOK8M/4LD/L+1Rp/todv3/23H+frQB+wHwX8b3fxK+Evg3xZfW0dnea3pNtqEtvESUjaWNXKjPYbsV2teUfsnnP7MfwoP8A1LGnf+k0der0xCrQwpR3psmcYrHqQfkXrn7CfxI+Ev7QGq/HDXDpI8FaPrs/iO4Ftd77n7KJGk+VNvLYI71F+31+358M/wBpD4Fp4S8JrrC6oNSiuib208uPYivnnd1+b0rW/ah/4KgPqlh8Svhi3h3aWa70YXf2bH3XKFs+f/s/3a+M/wBj39nX/hqP4rSeDW1H+zgLGa9Mxl8v7m3jOx/X0pgeGN971/Sv1O/ZN/4KIfC74Xfs3+HPh1rEert4ghtpLQ+Ta7oN8hYDLZHGWHrXyD+29+yav7JPjLw3oY1L+0m1TT2vGbzN+3ErJ12J6eleFeFP+Rs0P/r9g/8ARi0wPvz4a/sb+Pv2R/iTpvx08cNph8FaBO2pXS2FyZroxPnGIwvXDc819St/wWD+BfVY/ERzn72n/wD2XtX0b8ZvhKnxy/Z6vfBElybRNW06GIyhtuMBW67Wx09K+Cv+HLqbNv8AwlTE9z9sH/yN/SkM+/8A9n/9oDwv+0p4DPizwgLwaV9oktf9Nh8qTcnXAyeOlfmr8Qv+CefxU8P/AB61r4rXg0ceGLPV312UpefvjAknmEBO7EAjHvXTP+0U/wDwTAk/4U6un/8ACRDH9q/ajGJv9cem7fF0x/cr7t8SeMH+IH7LWs+JHjEI1Pw5NciILt27omOPvGmUfHnxy/aO8Jf8FFvAcvwe+Fa3w8W3UqX8baxB5FsY4fmk+fJ5xjFYP7O/iK1/4JZ6fq+ifGVZWvPFciXmn/2GBdJsiyr7jkYOWXH4188f8Elf+Tv9P/68Lv8A9FtXr/8AwW2/5Hr4af8AYPuv/RiVoI/S/wCE/wAX9E+OvwvtfGfhxbhdI1CGQw/aowknGQcjJr+e4fDnVPix+0VqvhLRRH/amq6/dW8HnPtTcZnxk1+1X/BOf/kyjwZ/17XH/ox6/KT9mP8A5SA6B/2N0/8A6OekHU+5bH4Na/8As4/s0+BfBnip7ZtWh1O/lf7JJviw4Vhg/SuLXxEmn+HZlWZlcXMbCQH7o7mvsf8AbFk8F/8ACH6LbeLfFFr4Tubm7aLS729kMcJm2ZKsQp6gd6+ddH/Zh1T4seH2ufBvjbw9rdtFKsU8+nXwkTO0HbkR8cGvCxeHlOrzI7KcrGEuoaX4y+J1kmjNa28sMGD5Db2kcKMsx/l+Nev6T481rQfJ85PN8sbCPXBrx7wz8J9B+E/jKQax8UvCGm6jp8wD2kmqASxEZyGBQdc/pXrep+K/hZI0ckPxQ8KiMtkg6ko/H7vrmuf6vKWljqhX9k7nqnhf4qaXriiOcrFOuA0bdq6mTU9NuBsKxjP5EV892HiT4XW97cSyfFHwiYm5CnUQemefu8da9C8MeB7zxlpqav4W8T6dq+iPkJdW115ibh97nbwBWLwk4nXHFUZfEztm8O6DMxddMtFz1/dDJrW8HeFdFh8SQXkOn28d1DG4jlSMBlzjOD+ArxUfEjwPo9xNFdfFXwrbzwSFJYW1HG1hwQRt65r0H4O/FbwJ4m8YPoGkeM9O8Sa+sDXJh0+481Uj4GTwMdf0Nb0aE4yTZlXqUJRfIfnL/wAFoMn46eFeflGijH/f1s1+fWmWbalqVtaocSTyrEv1ZgB/Ov0H/wCC0X/JcfCn/YG/9qtX5+aJqH9k6xY323f9mnjm24znawOP0r6RbHgp3PqD4rf8E4/in8H/AIYXvjrXptF/sW0hSVvs95vcq4BGBgetb/8AwTn/AGrPBH7LfiDxdf8AjL+0PL1S2jit/sEHmnKkk7hkccius+Pn/BTRfjf8CdT+H0nh5rM3dvHCLhbfGNgHOfOPp/dr4KkxuIFMo/SH44fsyeMP+Ch3jy4+L3wtNkvhS8RbNP7YuPIn8yLhsrzxyMV+fHjbwhf+AfFmq+HtTMf9oabcPbTeU25dynBwe9ft5/wSf/5NE0j/AK/7n+Yr8dv2nP8Ak4P4gf8AYYuP/QqCkeZDrx19q+/P+Cc37bXw8/ZZ8D+KtK8ZDVDc6leRzwfYLUSjaqsDn5hjkj9a+cv2P/2dB+098W18HNe/2ejWc1yZhJsPyDOM7W/lXSftsfskj9k/xdoGkLqn9pjVLZ7gMZfMK4ZRj/Vp6+nagZyn7Ynxd0T45ftDeKvGnhxbhdH1J42h+1xhJPljVTkfUV4vmv0F/Zs/4Jex/H74N+H/AByfEjWR1RGfyftG3GGK9PIb09am/aN/4JZr8Cvgz4l8cp4j+2/2PAJ2h+0btwLBenkL3Yd6ANT/AIIl/wDJXPiL/wBgOH/0eK4n/gsR/wAnVWP/AGArb/0N68k/Yo/ayb9krxd4j1pdMGonVrFLPaYTJt2yB848xPT1NfX6fAX/AIel/wDF3HvB4dNuf7G+xqxh/wBUd27G2Xrv/vfhSA++f2Tf+TX/AITf9ivp3/pOles1yfwn8Er8Nfhj4T8JrL5y6Hpdtp3mbt27yolTOcD+76D6CuspkjlpG6dKRW696fWHUg+P/FH/AASz+BXjfxNquvapp2tHUdSupbucw6myIXdyzEDbxkmvFP2k/gJ4U/4Jy+AI/in8GorrT/Fr3S6YZtWn+2ReRIrFxsYDBO0c9q+3f2l9P1rUvgH48tvDsd1LrkukXC2aWRImMuw7duO+a/DDXP2d/wBpTxBa/YdU8IeNtTsw/mLb3nmypkDglSxHT2qgPtz9lfwPpX/BTnw3rfjH45LJqWt+G7xdIsH0l/sSLAyCUgoucncx5r3Sz/4JR/s/6beW91DpmsCaBxKhbVGI3Kcjt6ivxx8R6D8UfgLcQ6dq0fiDwRPep9pS282S1Eyj5Q+FYZ7/AJ+9eh/Dfwh+0N4qi0TxLpcXjTUvDjzxzm/jupmg2LINxJLdBQB+1P7WnxE1n4G/s4eJPEvhaWKDVNItVFq1xH5qjHyjI78V8y/8E1f2yfiR+094y8W6d46vLG5t9NsI7i3+x2iwYdpNpzjrxX0JF+1f8C9Q0G103WfH3h252QRxXVreTBx5gUBldWHJB9a+G/8Agpd8Zvh23gfwanwY8SaTY6kL+dr7/hFnW2cxeWu3eYwufm6Zz3pDR9sfHj9hH4U/tE+OW8VeMrG/n1c20dqXtr1oV2JnHAHv3r8yfjB+3t8W/h1qHir4T6NfaZH4Q0t5tFtoprFZJxbL+7wZN3JxmvFfBPhn9oX4laG+r+Ff+E417SDI0JurO8uHj3DOVzv5715RqWh65L4on0q+tbqXXzcm3lt7gFpzNnlWyc7s+tUijqPgh8cfE/7Pnj6Hxd4RntoNYiieFXuoBMm1xg/Kfat39or9qPx1+09qWjX/AI5ubO4uNLikhtjaWywgK5BbOOvKjr71jeNP2eviX8O9D/tnxL4K1bRtLyB9qvLfanIJHPuAa/Qv/gjd4J8PeLPCPxDl1vQdO1eSO6tljbULSOYqCjk43qcc+npV9QPqz/gm5GJv2M/AqkZBinBH1kYU3wh/wTt+Dngf4nWfjzTLLUk8RW9+1/E73zGMTEls7Mepr6Oj0ew0HQ5bTTbWHTbWONikVqgiReDyAuMfhX4TfBP43az4f/bO06fxD411O18O2/iWf7QLzUpDbpGJnxkMcY5oA+2P+C0zCP4KeCABnzNbcf8AkEnP6V+fHwB/bc+J/wCzR4XvvD/gq80+30+8ujdzLeWizEybQuRkjHA/lX7k6D8SvhL+0BNLp2lav4d8bzWOZntlEdz5QyBu2nPt+VflJ/wWB8M6T4W+PHhi30jTbLS4ZNEEjw2VukKlvNfnCj+dS4pl8zsfGPxH8far8UPGmr+KtbeOTVtUna4uWij2KXPXArmOtdX8LY1n+JXhaKSNZoZNUtVeN1DKymVcgg1/SFH8IvAXkxE+CvDpLAEk6VASfx2U1FGUpM/mWTAr6V+Df/BQD4tfATwHbeEPCd5ptvoVvJJIsc9ksjkv97LEn26V+03xBk+BfwpW0PjCw8GeGheK5gbUNPt4w+0DdjKY4BGfqK/KD9tD4H6/8YPj7rXiv4QeDbjxB4HuIYRb6j4dtR9jdlXL7CgA4PpScURc+5dD/wCCXnwM8faNY+ItU07Vv7T1SBL25MWosimSQb2wo6DLV6v8B/2Fvhb+zZ4sn8R+C7TUYNSnga2drq9aZdh6jBr8Hbr4mfEDQZ5LB/F3iG0e3Yxtb/2lOvlsOCMbuMYqH/hcfj7/AKHbxD/4NJ//AIqp5S7n27/wWgjK/HPws20YbRgd2Op8w5H8q+AfDljFqXiDTLSdWaC4uooXCnBIZwDg/jXoPh/4XfFr4+2r6tpWi+IvG8dofIe8/eXPlHrs3MT9a14v2O/jnA6vH8M/EkbqdystqQQR3B7UbAj7v/au/wCCe3wh+Ev7MOs+NtBsNUh1+1tIZUkmvt0e5lBPy4968A/4Jrfss+Av2mvE3i+y8c215dQabbxSQizumgwWZgTkDPYV5dqX7Pn7Tes6e2n6h4X8dXlgwCm1naaSIgcAFN2O9fW3/BNXT7n9lHxB4vvfi/C3w8ttUtY1sZdeBtluHVjuRc8ZwQfxqrjP0l+B/wAEfDH7P/gWDwj4Rhnt9HhleZY7iZpG3Mck5Nfg/wCOPC9h41/bZ1bQdU3HTtQ8VNbXAR9jbGlwcHtX0f8AtuWXxW+N3x31DxH8HZfEXiTwbJawxQ6h4cuJGtJGUENgoQCQcg18rax+zD8ctFW58Q6h4F8TWv2YG5m1KWFw6AdXL9RTuNH7UfA39hD4Ufs6+Oh4q8H2mowassDwZu77zV2MpDfLjvWv+0F+xj8NP2mtc03VPHFnfXN3p0LW8Bs7xoQFYgtnA5PAr8tf+Cbf7QD+Ff2iIbn4gePbu10E6dcKDrWpyNb+Ztwo+diM5r2v/goZrfjD4/eMvCmofAfUdY8W6PY2MsWoT+E7mQwRzMy7Q2wgZIU/kaZR+kvwh+E+g/BLwBpng/wzHPFounqVgW5mMrgE55bvUvxZ+GWifGT4f6x4N8RRzSaJqsQhuVt5fLcqGDcN25Ar8If+FM/tUf8AQD+IX/f+4/8Aiq9u/Yr+GH7Qmh/tOeBb3xdpPjSDw9HdsLuXUpZzbqhjb72SR78+lMCb/gpR+xl8Nf2YfAfhDVvA9rqFte6lqclpcfbLxrhTGIiwwCOOa+rf+COeP+GW9Rx0/wCEguf/AECOvqn4veK/ht4R0rT5fiTeaFaafLPttf7eRHiMoXnbvBGcH9a/Hr/gor8YtJb46Wf/AAqbxUtp4b/sqFnTwzdtBbCYs2TtjKruxj1oA/cmivLf2XLu4v8A9nL4YXN1PJc3E3hrT3kmmYu7sbdMsWPUmvUqCRPpT2plOfkViQfBXjn/AIK+/DvwH4z1zw7d+ENenudKvZrGWWN4trtG5QkZPTKmsP8A4fUfDNuvgzxF/wB/Iv8AGu88W/8ABKD4M+NvFWsa9qVxrxvdTvJr2YQ3oRA8jljgYPrj8K+Vv2+v+Cf/AMM/2Zfgcni7wlJq76m2pQ2ZW9uxIhVlcnjA/u0wOi+KngS9/wCCtWoWnjf4ezReFLPwvCdGuLbXDueaRn84OuzthgOe+a+7v2bvgbq3wa/Zs0n4dalfwXWpWdlNbG5hz5eXLEH6c1+Kf7OH7cHxB/ZT0DVdG8Gx6Y9rqV39rn/tC3Mh3hQoxyMcCvXv+HxXx07QeHP/AAXn/wCKoA7LVf8AgjL8SL7UruePxjoCxySu6qySZALE4OPrXz/+1h+wp4p/ZH8P6Dq3iDW9O1aHWLqS1iWwVgUZU3ZOfr+lem/8Pivjr/zw8Of+C8//ABVetfs9eN9Q/wCCqGr6v4X+MeyHTfCkCanYf8I+n2ZzJKxjfecnI2gfrQNH0F/wSG+X9ktTnprN39Oq814L8Sv+CbPjfQfjHr/xdn8RaXLoljqj689jGr+e0UZ8zaO2eKwvjx+0F4o/4Jq+Nv8AhUXwp+xS+FhAuqD+2oftE4mmJ3fNkfL8ox+NeUeJf+Cs3xq8W+HtR0a9j0AWd/bvbTeVYlW2OpVsHdxwaaKPpX4gftOaL/wUt8ON8FfBenXnhvX7krqAvtYKG32wglxx82eeK+gv+Cff7IXiH9kvQPF1h4i1my1ibVrmGaJ7IMFQIrg5zzk7h+Vfi78Bvj14k/Z1+IUXjHwutsdWjheBReR749r4zxn2FfT/APw+I+OI6W/h3H/Xgf8A4qq6iP2yv4Wms50jIWRkZVLZxkg9cV+RfjL/AII5/EjxF4u1rVIPF+giG+vZrlVZJMqHkZsH864L/h8V8cv+fbw5/wCAB/8AiqP+HxXxy/59/Dn/AIAH/wCKpget/C34a33/AASa1S78e/EC4h8VWHiOH+yLe30XKypIp8wk7+MYH6VH8TvhHqf/AAVd1m3+JHgK4h8K6bosI0aa31vLSvICZNw2cYw4/Ovkn9pD9ub4g/tTeHtK0TxjFpaWmnXLXUJsLfy23lCpycnsa/Q//gjG3/GP3irnk66ef+2KCgo+fNP/AOCSHxD+HF9b+J73xXodxaaLIupSwwLJ5kiQnzGVfcha+wv2d/8AgpJ4L/aK+KNl4H0nw9q1hqNxFJItxcFDEdi5bpzzXyN+1X/wUr+LHg34r/EL4f2MOiNoVvPPpqmazLSeUybTzu64Y15D/wAErZDJ+2R4bH/Tndn8PKNUiWj6T/4Lb/8AHv8AC1fRr7+UdfRf/BLJSf2N/C/OMXV3z/21NenftNfsfeB/2rI9EXxi+oIdHMptvsE/lf6zbu3cHP3Rj8a/Pj4zftR+Mf8Agn58QLv4L/DFLF/CWkxpcwHVIvOnLTDe+X+pNBNh/jD/AII6fEfxJ4s1nU7fxfoaQ3l3LcKjpJlQzE4rH/4ct/ExevjHQP8AviSv118D6xN4g8HaJqdyFFxeWUNxKEGBuZAWx+JNfPP/AAUG/aQ8Vfsy/CLTvEnhJbNtQuNQW1f7bFvTaVJ4Hrmp6gfLPwy+KVl/wSh0u5+H3j+1n8U6jr0v9rwXGikLFHHjZtIfvkHpX6F/Dr4sad8R/hPp3j2ygmg028sWvlhm++qhScfXivz/APgB8MNI/wCCoHhi98e/F43EWt6Hcf2Ta/2M32eMw7Q/PHJyTX3zoXw40z4S/BKbwlozTPpml6VNBAbh9z7RG3U0WKPnj4N/8FNvA/xm+Llh8P8ATfDWsWWp3kzwLPcsnlhlzn+VaP8AwUA/Y/8AEP7XOg+FtP0DV9P0iXSbmSV5L8MQ25ccbR7frX4xeBfi3rfwO+NU3jLw6tudW06+neH7VHvTJdhyK/WX/gnT+2h4/wD2qPEHi2x8Yx6UsGk28c0Tafb+WfmZgc/MfaiwHnPw9/ar0H/gmroC/BPxpp154k1uwY3z3uk7VhKzfMANwznjvWxr3/BUjwP8ftFvfhzo3hnWLDVfFETaTbXNy6eVG83yAvj+H5q94+PH/BPH4ZftEfEG78YeJ5tXj1S4iSJha3W2IBBgcV+KvjRR8Cfj9qi+HfnXw1rTGyN0N+fKcEbvyosB9ft/wRj+Jcijb4w8PjjkFX69eMCvSvhf46tP+CS+mXfhD4g28viy+8VSjUrabQ/ljiSIbCG39SS3b0rof2Cv+CgHxM/aS+O0fhHxamjjSzYXF0PsNv5Um5Bx3OR615P/AMFrOPip8Ph/1Cp//Rq0Fntf/D6T4Zj/AJkrxCfpJF/jXd/A7/gqV4D+OnxS0LwPpXhXW7C/1aUxRTXTxlAQpbnB9q/Dg19Hf8E7c/8ADZXwz/6/2/8ARb0CPvD/AILYnf8ACH4dEgj/AInk3H/bua+NP2Yf+Cd/jH9qT4ey+LdC8Q6Tpdkl29oYr0OZCy4JPyj3719k/wDBbT/kk/w7/wCw3L/6TtXc/wDBHX/k1u+/7Dtx/wCgR0AfW/wW8E3Xw2+Evg3wpeyxXF1omkWunyyw52O0USoWGex212tFFMQlOY7fpTBnvSsAetYGaZ59e/H74aadeT2l3488O2tzA5jlhl1GJXRh1BBbiq0nir4VfGwf8I82r+GfGmf339mNPDdg7f4/LyenrjjNfmF8Wf8Agk58XvHHxQ8W+INPvdCFlqmqXN5CJbna2ySVmGRj0Ney/sE/8E+PiN+zL8cm8YeKrrSZdM/sya0C2U5eTe7IQcY6fKadxn1b4q8A/s7+A7iG18R6F4D0SeVN8ceo21tEzL6jcK3NC+BfwW8UabFqGkeCPCGp2En3Lm1063kRvowXBr5c/wCCin7Dfj39qrx94V1nwjc6bBaaZpj2U63kuwlzKzgj1619L/sffCDWfgT+z/4Y8Fa/JBLqmmxuszWz7oySxPBoAt6/8Cfgv4Z0ufUtX8DeEtO0+3XdLc3GnQJGg9SxXAr4g/b3XSIfCnhX/hm0266yb2b+1/8AhXjKtwbfyvk80wfNtzn9a+3f2tvhTq/xu/Z+8W+C9Ckgi1TVbcRQtcNtQHcDyfwr5p/4J1/sR+O/2UPGPi3UvFlzp1xbarYx28Aspd53K+45/D+tA0XP+CfvwhHjr4DjUPjD4S/tzxWNQmRZ/FFn5t35A27BulG7b1612nxg8N/s5x+CPFuk6dY+A4/Eq2U8MFnAlsLkXGw7VVR827PTFaH7Q3/BQn4b/s0fEBvCPim01afU1t47jdp9uHTa446kelfCd9+wx4+8RfEGT4+W15pS+C5r3/hJ1j89xdfZQ3m7dmz72FqkUcH+wb8HT4N/aCstS+LXhI6Z4Q+yzobnxNZhLLzCPky0ny7vSv1d8I/C34B+PLSeXwz4Z8Fa7DbYjlk0+0gmVCQcBioI5wfyr4++Mv7Snhj/AIKM+B5vg98M4Lyz8WXUsd6JNZiEUBjiIL/MCefTpXtH/BOn9k7xb+yp4Z8ZWHi2eyuJtXuoJoTZS+YuERgc+hyRWgH51ft0fs4+KYf2nPGQ8G/DbUE8OK0Ulu2l6XItsFMSkkFQF656V4/+ynaaNY/tL+CLfxfDa2+jxamqahHqgUQqgB3CQPxj61+wPxo/4KUfDH4I/EbVvBOvWWsvqthtWSS3twY8sM9SRgfnX51/Gb/gnb8SdF8KeKPircXekjw3IsutrGs5MvkysZFBBA52svTNAj9OpP8AhlHcPN/4Vju/7c8Z74/WvV/hL/wrn+w7r/hW39gf2T5377/hH/K8rzMfxeXxnH9a/n+/Zr/Ze8WftSeJ9T0TwjJZx3mn2wupTeSbFKltowfrX6B/An4q6N/wS98M3nw6+LEdzd63rFydXt5NFQTxeUVCYJJHOV/nSGj4G/ba/wCTrvid/wBhiT+S16l/wSl/5PK8N/8AXjef+iq9P8ef8E+fiR+1h4x1f4veEbvR4PDXi64bU7CLUJ3jnWJ/u7128Hitf4P/ALK/jD/gnd44tfjP8R59Pu/C2mo9pPHpMxlnLSjauAQO4podtT1P/gsR8R/FXw/h+G//AAjXiPUtCa5a7Ew0+5eHzMCMgttPOMnHpk+tfk/4n8Xa14y1iXVdc1S61fUZvv3V5M0sjcY5JOa/Tn4+P/w9aGjRfCJRYHwj5h1CTXcwhvOxsCYBz9w5+or89fjx8ENe/Z5+JF94K8SSW8uqWiI7taMWQq67lwSBVCsfuj8atYvdA/Yd1vUdNu5rG+t/CyPDc27lHjby05DA5FfhjJ4o+KXxwI0U6l4m8b+T+++xtNNebP8Ab284r9Mb79u74eftDfB9Pgj4ZttWj8W+I9Mj0SzkuIAtuJ9q8s+RgZXrWn/wT+/YJ+In7MfxevvEviu50mbT59Pa1VbGcyPuJB7gY/Wgdj8ux4g+KfwLb+yFv/E3gb7T++Nmss1p5vbftyM//Xr9tP2U/wBoLwTqX7PPga38T+PtFuNbm05IruHUtSjeeSQ8FWDNkn618If8FngT8dPB5y2f7F5HbPmGuA+E3/BNH4oeLfCHhz4iWd5oyaHKianskuCJfKQ7jgAHJwp9KAsfrrr3wV+C2i6ZNrWr+DfCFpY48yS+utPgCHdzuLFe/wBa/Pj/AIKRfEDwT4B8PeEJvgfr+i6DdT3Mwvn8GXUUErgKNvmeSQSBnjPTJx1Nd78S/wBrjwX+2R8OLr4B+DLfUrbxrqkaWUMuoxLHa+ZFjdl93QlcDjvXzr/w50+NnI/tDw5j/r9b/wCJoCx9k/8ABOv9o7w7J+zfpw8d/EexbXxdzeaNb1VDcBc8Z3tnHXrXTftCX37OWr/Czxve2k3w/vNen024eO4j+yvO8xQ4IIG4t6V+NHx8+BOv/s6/EK48HeJZbWbU4IklZrNi0ZDZxgkD0rk/BPhO88deLtI8PaeY1vdSuUtYWlbaoZjgEmgLH1Z/wSv8XaJ4J/adXUNf1i10Wx/su5T7RdyiKPJXOMnHpX6y+LfHn7PPjq4gn8Ta74D1y4hUrG+o3FtNsB5OCx4zgflX5hP/AMEdfjW3/L94f/G7P+FIv/BHP41BgDf+HwDxkXZP9KQHjH7bH/CJf8NZeKf+EQ/sv/hGvtcPlf2Zs+y7dibsbflxu3Zr9mvhiP2fv7S0H/hF/wDhBv8AhJtkf2b+zvsv2vzNoztx82fXFfg58YPgzrXwU+KGpeBdblt5NWsJkhke3fdHuYAj+dfafwn/AGJvHX7Gfi7RPjf44m0+fwn4ZIv72PT5fMnKFcAKvrlhRYZ+tfjLwD4a8fWttb+JNC0/Xre3fzIotStkmVGIxkBhwe1fkL/wUx8W6x8Dfj9ZeHvh3q154I0I6PDcPpmgzvZw+YXfL7EIXJCqM+1fVZ/4LGfBdVJbTfEJb0FqD/Mivzn/AG/f2ivDX7TnxqtfFvhaC9t9PTTIbNkvowj70ZyehPHzUgP29/Zh1K61n9nX4aX99cS3d7ceHbGWa4mcu8jmBCzMx6knNenV5R+yj/ybL8Kv+xZ0/wD9J0r1egka1G6hqXbXO9zDW5+RXxW/4K5/FLwL8TvFXh6y8OeGpLPS9SuLOGR4pd7LHIygt+8xnjtiuV/4fQfFz/oWfDP/AH6l/wDi68P0nR7HxH+33LpmqWkV/p1145njntbhd0cqm5fhh3r9qD+x38Dht3fC3wv0wM6en5dKFYZ+ZA/4LQfFv/oWfDJ/7Zy//F0v/D6L4uf9Cx4Y/wC/cv8A8XX6cD9j34Gdvhb4X/8ABcn+FO/4Y9+Bn/RLfC//AIL0/wAKtFH5i/8AD6H4uD/mWPDH/fuX/wCLr60/4J6/t0+Nf2tvGPizSfE2k6Tp1vpFjFdRtp6uGYs5Ug7mPoKuft0fsz/CbwP+y3451vQfh/oGk6rZ2nmQXVrZIjqdw6Gvmf8A4Ingf8LK+JDYwx0q3B/7/f8A16bK6nmf/BXw/wDGWRHro1r0/wCBcVq/Cf8A4KRePvEWi+GvhFc6HokPh6+jj0OW7hSX7SsLgRlgd+3IB9Kyf+Cvn/J2Tf8AYHtf5NX6Qfs4fsy/CWb4P/D3Xpvh74fl1o6bb3JvmslMvmBc793rQijJ/Zz/AOCcvgT9m34iQeNfDms6xe6ils9uIb50MW1wMnAAOeO+a+ttv+FMikCqqgYGMAVNViPjf43f8Exvh58dvihqPjfWdf16y1C+aNnt7N4hF8qgd0J7V337aGjReHf2JfiBpUDM8Fj4dNtGz43FUQKCcd8AV9B3zFbOchireW2GBwRxX87Hxk/aX+KfiDxF4w0DU/H+v3eiy391btp8167QGMSMAuw8dhQB9Qf8EW8/8Lu8c/NtA0ZDj1Pm4H86+6/2ov2BPBP7VfjKw8ReJda1jTruytPsUUenMgUqGLc7lPOSemK+Ev8Agi/IX+N3jPkn/iTR9TnH78V+xpplI/H7xl/wUU8ffsl+KNT+D/hnRdD1HQvB87aXZ3d8khmljXkM+GAzyelaPwz/AGsPFP8AwUc8WQfBHx7p+m6J4a1ZGu57vRUdblWhw6AFmIxkDqD0r5B/bY/5Ow+KP/Yal/kK8w8F+ONf+HmvRaz4a1e60TVY1ZEvLOQxyKrDBAIpoZ+l/wAZIV/4JNJpknwwH/CQP4y3i+/4SL5/L8jGzZ5ezGfNbPPYVvfDX9lPw3/wUV8Gw/G7x7qmo6L4j1N3t5bPRWUW4WDCJgOGboBnmud/4JpTN+1RN46X4xSf8LHTR1tzp6+I/wDShbb9+7Zu6bti5/3BX6Z+DfA3h3wH4ej0Tw5pFno2jxlmWys4wkILfewvvTA/Af8AZb0WHw7+214H0y2maW3s/En2eN2ILEKzAE478V+v37ef7THiH9lv4S6f4o8OWFjqN5cX62jRX4YptK5yNpHpXpun/sz/AAp0nxJDr9n4A0C21qGf7THfRWSLKsn9/Pr1rpvH3w48LfEzSY9M8V6DY+ILCOQTJb38IkQPzg4PekB+cfwk+Fun/wDBVnRrz4g/Ei7uPDuqaHP/AGTb2+gkCJo9ofJEm45yT0x3r9Cfh38JtN+Gvwt0/wACadc3U+l2Vm1kk87AylCCCemO9XPAPwx8JfCvS7iw8IeHrDw5ZTyedLb6fCIkd8feIHfrX4n/ALXX7T/xb8JftIePNI0f4jeItP0211F44La3v3VEUdAADxTA+u/il+xj4V/Yf8Paz8dfB+rapqvifQna5gs9TZDbFpGIOQqg4GfWvQv+Ce/7bfjT9rTxF4qs/E2laRp0Gl28c8P9nJIpO5iuDuY56D071+R3ij9pf4r+N9ButE174ga/rGk3WBNZ3d68kb46ZBNYXgH4teNvhXcXE/g/xNqnhua4UJK2nTtEXAzgHHXqfzNAH7a/tCf8E2/AH7SHxLu/Gev69rljqFxGkTQWDRiLCjAzuUn8sV+S3g/wXa/Dr9s/R/DNlLJPaaV4qjtYpJsb2VZQBnFZX/DY/wAcm5HxS8T4/wCv98fzrN+AusX+v/tJeB9R1O6lvb+5163lmuJ2LPIxkBJJpAfuF+3T+0Xr37MPwU/4THw7Y2OoagL+G18nUAxjKueT8pBziuT/AOCe/wC1l4l/ay8G+JtV8TadpunXOk3sdtEunbgGVoyxLBiT1FfSXjr4e+GviVoZ0jxVodlr+l7xIbS+iEibhyDg981S+H3wr8IfCq2ubPwh4c0/w5a3TiSaLT4RErsAQCQPQfzoA/DL/go9cG1/bW8dyrjMdzA4z7RIa98+HP7b/jD9tbxBovwJ8X6Zpmm+GfFJXT7u90pXW6RUG8FSzFf4MHivn7/gpT/yeZ8Qf+u0P/opK+ePCvirWPBOvWmtaDqVxpGrWjb4Ly0cpJGcYyCPrTA/YQ/8EZfhI3A8UeKPqZYeefaMe35V+ev7eX7Nvh/9l34yW3hLw5fX1/Yy6bFemXUHRpNzlgR8qjj5a+yP+CSvxw8ffFb4neObLxd4v1bxHaWmjRTQxahdNKsTmYKSMnjgmvEP+CxX/J1Fj6/2Ban/AMfl4pAfrB+yj/ybL8Kf+xZ07/0nSvV68o/ZR/5Nl+FP/Ys6d/6TpXq9IljcU71oNOrKxmkfz9eD/wDlItD/ANj7N/6VyV+lv/BWbWtS0L9mCC60zULrTbhdbtx51pO0T/dfupBr80fBn/KRa2/7H2b/ANKnr9If+Cvn/Jp8X/Yatf8A0CSnYZ+NZ+KHjPd/yN+unv8A8hOf/wCLrT8L/ErxdceKNFSXxTrUyG9hBR9RmYEbx1BeuClPzGtXwbn/AIS/RP8Ar9h/9DFMD97v28GaT9h3xs7MWZtIiYknOT8vevib/giif+LkfEYeulwj/wAimvtn9u7/AJMZ8af9geL/ANlr4l/4Ipf8lM+IX/YMh/8ARppDLP8AwU0/Zb+K/wAX/wBo5tf8G+CtR1/STplvD9qtVXbvUNkckV+f2reKvHvgvULjQrzX9e0u509zBJZf2hKnksOq7Q2B+Ff01yRjdx/9avyd/aH/AOCU3irUte8ffEL/AITnSFspHudWFl9klMu0Avsz93tQijwn/gnj+0RF4B/aGtdS+IXjm9svDwsp1aTU76WSHzCvyDBJ5zX0d+3hrHib9rXXvCOofs9anqfjTT9Jt5odTk8NXTxJDI7IYw/zDkgN69DX5YMNv4V9k/sH/t0aJ+yHoPimx1bwtfa++r3EM8b2dwsRTYrKc7uDncPyrQR93/s0ftJ+CfgF8B9F8D/FnxlBoPj3T45BfabrErtcoSx27ieufrX5sfsw/wBneJv25fDTNFBqWnXfieSRfMXfHIjTOQcMDkEEV9S+I/2JNa/b51G6+Omj+J7Hw1pniLMiaTfQu88fljZgsvynoK+Hfg/44i/Z1/aC0rxBfWraunhnVHDw252GUxuVJBPTkGgZ+sP/AAUg+Avi3xJ8NfDMfwe8LyQ6rDqLm+/4RxEtJTB5RxuZNuRn19a/KT4oaf8AGL4Ma1BpHjW98T+HdQmi8+K2utQmVmQsRuGG9Qa/ZP8AZJ/b90L9rXxdq+g6X4XvtBm060F0z3lzHIJMtt2gL+PWuH/bk/4J9a9+1t8SNG8T6R4t03Q4LPTxZmG8gkcvhi24Ffr39KBo9f8A2PvA/hvxF+zL8O9S1TQNM1PULnSkea7vbOOaaRtzcs7Lkn617Efhd4M/6FHQsf8AYMh/+Jr4A8Af8FCNB/Zmu9E+Ad/4S1LWtT8N3MXh99Zt7iNYJnLgBwhGcZevsz9pT4/Wf7N/wjv/AB1qWlXGrW1tJFGbO3kVHJc4HJ460AfBf/BYT/i3H/CuG8IhfCz3H2vz20YfZDLgJjcY8bsZOM9Nx9a+lf8AgmFrF9rH7Ivh261G7uL26e7ulMtzKZGYeaepJJr5o8YSD/grwbePwun/AAr+TwVkz/2z/pP2jz8ABRHzx5ZJz6ir3h39rXS/+CbWkr8Dte0K68Y6lo5a7bVdPnjhhl8/94AFb5hjOOfSqGfYl9+3b8BtJvLizvfiXotvdQSNHLG0pyGU4IOB7V1Hwz/ae+Fnxo1mbR/BfjLTvEOowxGZ7e1Ylgo7nI/ziv5z/GWuJ4k8V6vqscZijvLqS4VGOSoZicfrX29/wRv/AOTjtY/7A8n86APeP+Cm3wZ+NnxI+Knh27+G2l+Ib7TItOMVw+j3TRxiQt0IDA9vfvX1L8DPgrDZ/s06HYeKvCFlJ4wGjPFd/brOKS5MxRhguw3Fs46mvodumK+CvjD/AMFaPC/wc+Jev+DrzwDq19daTctbS3EN7Equw7gEcUAfH37Pf7NvjL4FftC2Pjn4q+B5tA+Htjd3D3mo6vAhs4kOdhYEnj04r2f9urRfDX7XGj+GLL9njTNM8Yahps8kupJ4cto4niRgApf5VyM571r+IP259F/4KAaXL8DtE8MXvhTUPEv7uPVtQuElhg285KoM/lWN4Q8OS/8ABIu4l1nxVcJ4+h8XKLRI9IBtjAUO7cS4+n61JJ3X7IHjD4Ufs2fBO28F/Gz+wvDHji3uJppdP16ySS7WNm+QkhW4/GvzM+Kmzxr+0B4iXwQBfJqGsy/2YumoY/M3N8vlgHivu3xR+ynqv/BSzVh8a/D3iCz8GWGoItmNK1KB55k8oYJLqcc18G2cZ/Z6+P8AAL4/2ofC+sKZWg+XzvKbJ256ZoEetn9lX9rMYA8MeORt/wCn+Tjj/rpXnfxO8PfGv4J31jZ+NrrxR4cub2MyQR3WpSgyKOuMOfUfnX64fst/8FINA/am+KSeC9O8H6lotw9tJdC6urhJF+Rc4wvSqv7dn7Bmu/tc+LvDer6T4o0/QF0q1e3eO8t5JN25gwI2/Q9fWgD8ofDn7K/xs+LmgweLtL8G614h0u8VpE1Rm8wShep3M2a8ZuIGtpnicFZEYqynqCDg1/Rp+zn8GLv9n79nvS/At9qMWq3Ol206tdQoUR9xduAenWvwV+Enwjuvjv8AHiy8C2WoRaXd6xqE0Md1OhdEILNkgc9qos+mv+CUfxo8EfBP4k+OdS8ceIrPw7ZXmjxwQTXjEK7iYMQCB6D9a6f9u/4a+J/2yPjRB43+DWkTePvCsWmw6c+p6V80YnRnLJk45AcV47+19+wVrn7IXhPQ9Y1fxVp+vx6vetZJFZ2zxFNqFyxLH2r0L9if/govoP7KvwmuPB+peDtQ12eXUJL37Va3KRrtZVG3BHbaaAP1p/Z08P6h4T+Anw80XVbaSy1PT9AsrW6tpB80UqQqrqfcEEfhXo9cv8MfHEHxL+HvhrxZa272ttrenQajFDI25kSVA6qT6gGuoqSQNPptDdKgg/n68Gf8pFrb/sfZv/Sp6/bz46fAXwl+0V4Jj8LeM7a4utIE6XOy1uGhfeoOPmH1r8SPjJ+zF8apPjp411vQ/h94r8uTXry5s76zsJVypnch0YDPPtVNvhb+1eM7dF+Jhycnm6HP50AfqD/w6V/Z36f2HrHHH/IWlqWz/wCCUf7Pmm3lvdQaLrCzwyLLG39qykBgcgn8a/Lf/hVv7WH/AEBPiZ/31df40f8ACrf2sP8AoCfEz87r/GgD9ef+Cglqlj+xf8QreIHyotOVF3HJwGUDn6V8N/8ABFH/AJKZ8Qv+wZD/AOjTXzDqXwZ/aj1yxkstR8NfEW9s5PvwXCXLo31BOK+0P+CR/wAFvH3wr+I3je48X+EdW8OW11psMdvJqNo0KyMJGJUEjk4wfwpDP1Gb7wrK8UeHbPxZ4f1DRb9Wax1CB7WdUO0lHUhgD9K0mGOOvavwz+PXwx/abvfjP4zuNE0X4htpUmqTNbNaC6ERjz8pXBxj6UIZ7n+31+wT8JP2fv2fr/xf4R0zUodaiu4IRJPfPKgV2APyYA9K87/4Jq/sg/Dj9prw34zvvHNhfXc2m3UEFubO8aAfOkhbJHX7o6V4JrXwH/ab8TWZs9X8JfEDVLQkN5F7Fcyx5HfDZGah8P8A7P37SXhFJV0TwX4+0dJMGRNNguIN+DxnZ15P61SGfQ/x7/a1+In7FvxM1n4QfDK6sdO8E6GQllbahZrczKHAZsyN8x5NfLX7OfhOx+OX7SfhjRfFCtcWWv6qxvRAxjLeYSzYI5HJPSv2S/Y9+C8V1+zd4dl+I3gyC48YGKX7W2u6esl6xydu5pFLZ6V+SHi79lv43WPxG17UNF+G/iu1A1O5ltbix0+Vdq+a20oyjgY9KoR+0PwE/Yt+F/7NfiDUNZ8C6dfWV5fW/wBmna6vHmBUEMMbunIr3ivzL/4JbeFfjT4d+KXit/iVY+MLXS5NKUWzeIPP8oy+YPu+YcZxVT/gp94K+NniL4yeH5/hzp3i690kaSqTNoHn+UJfMbhvL4zjFBZ8a/tEf8n9eIv+xsg/9Djr9S/+Cqf/ACZn4h/6+7P/ANGCvyNuv2Xfj1d6o+oT/DjxjNqJk8xrqSwmaXf6liOor6q/YR+E/wAaLn9orRY/ij4Y8V3fhEWs/mx+JYZ5LPeE/dlhJlc7sYzQB8l/s+/tYfEL9mGXWX8C3tnaNq3li6+12aXAbZu243dPvHpXLfGT4yeJfjx44ufF3i2eC61m5RI5JIIREhCrgDaPav6K2+Bvw7bOfAnhvPTP9kwen+77V+R3/BQT9ljx9rH7TWtXngD4Z6tP4d+z24gl0XTG8jeE+bbsXGc0wPsXwX/wSt+AfiLwfoWp3ekav9qu7KGeUx6pIqlmQEkD8a80/ai+EHhz/gm/4JsfiF8FobjTPE19djTpZtUna8j8kqSRsbj8a+c/2W/hp+0hoXx++H82v6L4/tNAt9SiW5a8F0LaOEZyGyduPrX7TeIPCmj+LLVbbW9JsdXt1O4Q31sk6A+u1gR2pgfiG3/BWb9oXJ/4nWi4z0/siLFfKfxE8eat8TvGmq+KNdkjl1bU5jPcPCmxCx9F7Cv6SB8Efh5jnwL4cH/cKg/+Jo/4Uj8O/wDoRvDv/gqg/wDiaQj+cX4S/FbxB8FfHWn+LvC80NvrViS0Ek8QkUZHdT1r9E/2WdavP+Cmmr6vpHxzkGr2Xh2NZ7BNJRbAqzkhslOTn5evofWvq79uL4AaLq37M/i608F+AdOm8QyRL9nTStLjFwTn+Equa+df+CSHwa8c/Cvxd46l8YeENX8NR3FpCkMup2j24kIfkLuA3Hkfn70hH338Ffgj4X+AfgeLwp4Rt5rbRoXeSOOeZpWBYkn5j9a/CHx14XsvGv7bOraHqEbTWOoeK2tZ40cozI0uDgjpX1b/AMFDPAnx98RftIane+A9M8cXOgfZYER9F+0fZtwXkDYcZ55/Cvj/AP4ZX+P51T+0j8OfGX9o+Z5v2w6fP52/+9vxuzRYLH7S/A/9hP4Sfs8eNl8V+DNN1Kz1hYJLYvdX0kyFHGG+VuK+fv8AgpR+2V8S/wBmTx14T03wLqFnZ2mpWM09wt3ZJOS6uoGC/TgmvK/+CbvgX47+HP2io7r4h6Z40tfD39m3ALa6ZxB5mAEGHPX0rY/4K2/BXx/8UPiR4IufCPg/WPElpa6dNHNNp9q8yIxkBAO3oeT+VHUOp9qfsa/E3Xvjh+zV4W8W+KpobrWdUhlNy8EIiRvnZRhRwOMdK5H4a/8ABOr4N/Cv4iab430HTNUt9f064a4gkk1F2j3kEHKHjGCa/Jjwz8E/2oPDbWNnY+FfiFplhDIoMMUdzHCilgckdAOO9fsR+19pfifUf2SfFdl4ah1ObxS2mQrbx6bv+1GXKZC7Pm3dadx3Pl3/AILZf8kl+Hn/AGHJf/Sdq/IMfeH1/rX0B4i+AH7Sni61ittc8GePtXt4XLJHqFtcyqjdyN/TpX6Xf8Ez/wBnpPD/AMAb21+Inw9htNd/tid1j13S1E5jKptPzrnHBoA+nP2UP+TYvhR/2K+nf+kyV6tVPTNPt9Ks4bSzgjtbSBBHFDCgREUdAAOAKuUhBH90fSn01e9OrIgKKKKYBRRRTAKKKKAEIHeloooAKKKKAEpaKKAEIpNpp1FADdpo2mnUUAIopaKKAExRtFLRQA0r6UbTTqKAG7TRtNOooAbtNG006igBu00bTTqKAG7TRtNOooARRRilooAa1JStSUAKvenUi0tJAFFFFMAooooAKKKKACikrzP4v/tCeDfgffeGrXxZez2k3iC9Fhp4ht2l3zHHBx0+8OtAHptFRpIG4pzHHtQA6isXUvGGiaLdGDUtY0/TpcBhHdXSRsR9GIqt/wALI8J/9DRo3/gwh/8AiqAOjorDsfG3h7Vrpbax13Tb25YFhFb3ccjYHXgGrf8Abmn8j7dbZHB/fL/jQBo0Vnf25p//AD/W3/f5f8aP7b0//n+tv+/y/wCNAGjRWd/bNgxAF9bE+nnL/jUMHiTSbjUv7Pi1Szlv8bjarcI0uB32g5oA16Kjj475qpq+uadoUKS6lf22nxO2xXuZVjDMegBY4zQBfoqOGRZlDowdGGQynIIqSgAooooAKKKKACiiigAooooAa1OprU6kA1aG60LQ3WmAlFFFACrTqatOoAKKKKACiiigBG6V8Bf8FQ5Fi8XfACR2CIvitCzNwAMryT2r78avz2/4KuaHaeKNV+B+j6gsj2F94j+z3CxMVYxuFU4I6dazv+8SE9j7rTxl4fXrrumj/t8j/wDiqtWfiTSdSmEVpqlndy4/1cFwjt+QJNfJy/8ABKn4At/zCdcH+7rlwP613/wV/YW+FPwA8aJ4q8IWOrQ6usD26tearNPHtbGfkY4zx1q/tMmJW+On7CHwu/aM8cDxX4xi1iTVRax2gNlqLQR+WhYj5QCP4jXzp+0P+wT+zN+zn8K9Y8b69F4iMNkm23tf7abfdTkHZCoIGSx4/nxmv0Mupo7O3knmdYYY1LNI52qoAJJJ9OMk+1fm1bx3X/BSz9qQzush+BPgC5xGCcJqlyOpPu2P++Mf3qZZv/8ABMX9jk+FfCd/8UfFdpNY6r4ltJLbSLFpW8yxsJCdzkn+OQbMHqAqnqTXqX/DrP4KHjzvF4x/1ME35V9dWlvFbQxxQxrFEihURRgBRwAB2GP5VZ20Afkz/wAFCP2N/Af7N/wn8P8AiDwbd+IotQvteh0+Zr3WJZ1MLRyuQAehyin6A19MWP8AwS/+C95ZwymbxdvZfnVPEEwCt3XGOMHiuY/4LEru+APg0ZI/4qqD5lbaR+4n6cHP0461jeLP2dvjl+y3rd748+B/iu78a6DqDC81Xwfr0jXDPkZZo2Zvn4LdCDz3qbgejt/wS1+C6qSJvGAOOM+IZTjjr0rwz9tTTT+yf+2H8IfjJpayw6DqcaaNq53jc3lKsTFz6mBlOe/lV9M/sv8A7eXgn9oudtAuIpPB3jyBtk/hzVWxIzAfMYzgbhxyCARkZ61Y/wCChHwZX41/sw+KLGC3afWNHT+2dPVR85khBZkX3aPeAO5xVAj6Rs7hLi1jnidZYpF3o6HIYEZBz9K/Ob9t55v2mP2zPhZ8C7AySaVorDV9cZDhVRgJGDf9s0UD3kFe/wD7Dfx+sviV+yLo/ijU7pReeHrN7DV3Y5Mb20fJb0ymHx6OK8O/4Js6BffFn4j/ABZ+P2twbpPEOqSWOl7/AOCINufHtjy0/wCA0CP0J0y1hsbOC2t0EVvCixxxr0VQAAB7YxVuoIV24Gc1PQUwooooEFFFFABRRRQAUUUUANanU1qdSAatDdaFobrTAFp1NXvTqACiiigAooooAKKKxPGuhXXibwrqmlWWpzaNdXkDQx6hAMyW5I++oyOR9aANlulfA3/BTz/kcf2f/wDsa0/pWxJ+wD8Unb/k6nx1gdMxMP8A2tXPeKv+CXvizxxJpsniL9ozxXrT6dN9os2vrMy+RJx8yZm+U8Dn2FRb3lLsJn39H9xPpSt0zXxCf+CfvxSySP2p/HC57eUf/j1S237AvxTtLqGVv2pvHEiowbYYjg47f66qerEkcX/wU0/ayh0JbP4J+G9ct9J1LXGRdf1hmJXTbNm5jO35tzjkgfwZHUivRPgN+05+yv8As+/C/RvBPh/4naJHaafEBNOIpt11cEDzZ2/d8szZPtwBwK9o179kX4PeMtWm1fxJ8OvD+v63cBPtOpXtirTTsqhdzH1worP/AOGH/gF/0SLwt/4L1plGt8M/2sfhF8ZPEv8Awj/grxxp3iHWPJe4NparIH8tcbm5UcDIr1wPu+leZfD/APZo+Fnwp17+2/B/gHRfDermJrf7bp9qIpPLbG5cjscCvTVGO2B6UmB8F/8ABYrP/Cg/BX/Y2W3/AKJmr7j0dA2j2PXiCPp/uivmf/goh+z34x/aO+FfhrQPBcNrPqNjr8OoyreTeUgiSKVSc+uXHFfUGnW721jbxPw6Rqrc55AxUgcDJ+z/AOA2+LUPxKPhqyPjKGB7ddSEfzYbHzY/vAAgN2DN616BNbpNbyxuqyRupVlbowI5H5VPtprLxVAfiN8SvE+vfsga78fPgRpS3Ey+M7y0GjN02RTOWZh/vRukf4V+tX7NPwntPgl8EPCPg21iWI6fYx+eVHLzsoaVj7lya0fF3wH+HvjnxZZeKdf8G6PrHiKy8v7NqN5aJJNF5bl0w3+y3Iru4V2xrwF46L0/CqAmWn0xe1PpAFFFFABRRRQAUUUUAFFFFADWp1NanUgGrQ3WhaG60wI4Pur/ALo/lUvcVFD91f8AdH8ql7igSFooooGFFFFABSUtFACbRRtFLRQAlLRRQAUUUUAFFFFIAooopAFJS0UwE2ijaKWimAUUUUAFFFFABRRRQAUUUUAFFFFADWp1NanUgGrQ3WhaG60wGRrtjX6CnrXzx+2d+1A37Knw90rxKNLk1YXV19l8iORU7A5yVNfFv/D6h16+CLof9vcf/wAbpkH6t0V+U3/D6j/qSbv/AMC4/wD43Sf8PqP+pJu//AuP/wCN0ij9WqK/KX/h9T/1JV3/AOBcf/xuj/h9T/1JV3/4Fx//ABugZ+rNFflK3/BaN5ceX4MukKkZJuoiOuP+edfpH8OfHz+N/hfovit7doTf2IvPIJ5A2lsZxjtQB3FJnFfmXqP/AAVxfTfiLP4c/wCETu5UhvvsXm+fHtPz7c48vP619+eOPiB/wh/wr1fxgYJJlstLbUPJBGeI9+3P/wBagDuNwpa/Nf4L/wDBWA/Fb4peHPCf/CK3Vr/a12tt5rXEZAyfQR+3rX6SRtwM8HANAElFJuHrTJJAuOe9AElFfLX7cH7Yn/DJGleGb7+x5tXGsXE0OIZFTy/LVTzlTnO/9K+Sv+H0q7gf+ENu/p9pj/8AiKQH6tUV8+/sW/tPD9qv4a6h4oGlzaV9lv2svLlkV92FDZGAMfer3yYnoOMjHNSBNRX57/tJ/wDBUQfAH4w674K/4Re41I6e4X7QlxGqtx2yleXf8PovtDIP+ELuk+YctcxEdRz9yqQH6sE4pa5Dwr4w/t/4e6f4j8gj7VYLf+SSP4kL4z+Nfm5ff8FmhYX1zb/8IddP5MrR7vtMY3bSRn/V0wP1SpK/NP4T/wDBWw/E34leG/C6eE7q3/tW9S1MjXEZC7s/9M/av0mjYsoZhtJ7ZzigCbIoyK8U/a4/aCH7NHwhn8ZnT31LyrqK38hG25357/hXwh/w+k2sSvgq8GR/FeREfgPK4oA/Vqlr5B/Yl/bm/wCGtNe1/T/7Dm0r+zIVm3SSK+cnHZRX1233T2yKAH0V8aftq/t6f8MneKtF0ZdBm1U6hbNceYsyrjDY7qfX9K+cf+H05yf+KNuP/AmP/wCN0AfqxRkV+U3/AA+nP/Qm3P4XMf8A8bo/4fT/APUm3X/gTH/8boA/VhqXIr8pv+H03/UmXR/7eY//AI3S/wDD6Y/9CZd/+BMf/wAbpAfqvmkr8xPA/wDwWAPjHxlouif8IjdQfb7uO23m4jIG9wuf9X71+mPnEYHI4HGT/hVDPgr/AILMD/jH/wAOf9hj/wBkr8/f2Ff2RtN/a48XeJ9I1HXLrQ00iziulltkRy25ypBDemAa/QL/AILMf8m/eHP+wx/7JXgH/BFHP/C1viNj/oEW/wD6ONMmx6i3/BFHwh2+IOrfjbxDHtSf8OTfCJ/5qBqx/wC3eOvSP+CjX7Y3jn9lu/8ADMPg+PT2XUkkab7dAZOnA28jHfP4V8UH/gr/APHLPMfh/wDCxP8A8VTGfR//AA5L8Jf9D/q3/gPHUif8EU/CEP3vHmrN6fuIxXzb/wAPgvjivPlaAf8AtyP/AMVX6nfsb/F/XPjt+z34c8Z+IhbrquoBjILZNicNjgfhSA/Bb9oz4WwfBH4zeI/BlpdyXtvpdx5KzyqAzcDrX7/fs22ovv2cPBMBfZ5mjxJuHUZjx/Wvw8/4KAf8nc/EP/r/AP6Cv3E/ZrmNv+zf4KkX7yaNEw+ojoA+SdS/4JFeF77x5P4jPjfVo5pL43v2YRps3b92K+tf2hLEab+zP46tVO4QeHbiLd67YSM/pX5ceOv+CsXxo8O+NNb0y1TQzbWd5LBH5tnltquQMnIzxXF+Nv8Agql8Y/HnhHVvD2pJoo0/Urd7afybQq+xhg4O6mB4v+xn/wAnRfDn/sLw/wA6/dr9rL44Xn7O/wAD9Z8cWNjHqVxYmNVt5SQrbjivwm/Y05/ag+HA/wCovD/6FX7Hf8FPv+TN/F3+/B/6HSA+M/8Ah9Z4wLEjwJpf/f5/8aQ/8FqvGP8A0Ielf9/n/wAa+bP2C/2f/DX7SXxsfwn4oe7j09rSWffZyBHBUE9cGvoD/goH+wr8Ov2Z/hHpviLwm+pvfXV+tu/264Ei7SM+gpgeGfthftzaz+11onh+w1bw9aaINHnlnRrWRm8zzFUHOfTaPzr5b5Jye9faP/BOH9k/wb+1N4g8bWfjB75ItJtbaa3+xOEO6RpA2cg/3Vx+NVf+Cj37KfhH9lvxR4SsPCJvWt9TtppZjeSBjuVlAxgD+8f0pMD7i/4Iyf8AJtevf9h+X/0XHX33L905r4E/4Iw/8m0+IB/1MM3/AKJir78k+7z0qQP5/v8AgpMAf2wPG/8A11T+VfSPwD/4JSeHPi98GfCXje58Z6hZXGtafHfm0jhRghbPy5xkD/Gvr74zf8E2/hV8b/iBqfi/xFJqy6rqDbpvslwEToegIPr2xXw18Sf28viP+yr4+1j4SeEl01/C3hG5bSbB7yFmm8lDxufd1wfSgDe1j/gqn4l+FK33w/i8HWF9baGH0hbuWVw8qRjywxHTPFfm7qF0b68uJ2ADSyNIcepJNftD4V/4Ji/CP4ueHdM8Za5JrP8Aa+u26ajdi3ulWPzZRvbaNnA+atb/AIc+/A7/AJ6a9/4GL/8AEUAfkt+yh/ycl8O/+wvD/M1/Sav3V+lfn944/wCCcnwr/Z58J6r8SPDMmrf294at21GzF3cLJEZE6bl2c14z+zB/wUv+Lfxb+PnhTwdr8Wj/ANm6neeTK1vbFHA2nvk+3pQB+hf7UH7Plh+0x8L5vBeo6lNpdtLcx3BnhXcwKZxx+Nfld+2x/wAE6dD/AGV/hLF4v0zxTe6xNJfx2Zt7iJV++GOePpX6Q/t1fHTxH+z58Brvxd4XFt/asV7DCPtcZdNrbs5A+lfCvwC+OniP/gpR44f4V/FVrSPw3HbtqinR4jBMZYiNvJY8cmgD5c/ZD/bE1X9kfWtav9K0K01t9UhWJlunZAgBzxg/5xX6xfsH/tnat+1xaeI5tV0O10R9LMYjW1dmDhickk+mB+dfAf8AwUZ/Yz8Bfst+G/DF54Qe+abUrh45vtsvmdFyNp/P9K9p/wCCKP8AyD/H/wDvR/yoA4H/AILRc/FXwZ/2D5P/AEJawP2Lf+CcHh/9qL4R/wDCX6j4ovtJn+1vb+RbxKw+XHOa3/8AgtIM/FTwZ/2D5P8A0Ja+pP8AgkN/ya24/wConL/IUAedD/gif4P/AOh81X/vwlH/AA5P8H/9D5qv/fhKwP22v+CjHxR+AX7QGs+DvDUWlHSrWGJ0+1W5d8sDnkEeleDf8PgPjh/zy0H/AMBG/wDiqAPpj/hyf4P4/wCK81X/AL8JWb4i/wCCMvhPQ9B1LUIvHOpyta20s4jeFArFFLYP5V4Dp/8AwV4+Nt5fW8MkeiCN5FVtlqwOCwH973r9eI9eufEnwTbVLwKLq90J55NgwNzQsTigD+d34Iwpb/G3wdGrbguswKG9QJBzX9LxA71/M/8AA/8A5Lh4P/7DEH/owV/TJTGfn5/wWZ/5N98Of9hgf+izXgf/AARP/wCSqfEX/sE2/wD6NNe+/wDBZr/k33w5/wBhgf8Aos14H/wRP/5Kp8RP+wRb/wDo00iI9TpP+C1xxqngH/rhL/Ovy3dq/Uz/AILUWs1zqfgPyoZJdsEudik459hX5dtpd5/z6T/9+2/wplFbPzCv3+/4Jof8ma+CP9yT/wBDNfgWul3qsP8ARJ/+/bf4V++n/BNNWj/Y38EqylWVZQVIwRhzTA/Ij/goB/ydz8Q/+v8A/oK/cD9nT/k2Xwh/2A4//Rdfh/8A8FAP+TufiH/1/wD9BX7i/szRxzfs7+BI5VDo2kQqynPIKDNAH8+/i+zg1D48ara3K77efX3jkXOMqZsEV+svxY/4J8/BPw/+z5r3iOw8LtDq1roP22OZZuknlbs9PWvdPG/7JvwRXT9a1pPh94ej1pYpbtb3ycSiYKSHDE9c1+Tnw9/aO+LfjD416H4R8Q+Ntd1Hwhfa0unXWmXM5NrNa+YV8phj7u3NMD5j8G+MtU+H/ibT/EGiXH2TU7GYT28xAbYw6GvuX9mT9pTx9+2R8ZNF+FvxT1j+3/Beq+Y93Y+WE3+WhZDn/exX2b+1F+yr8EPC/wCz7411XRPh94c0/VLPT5WgubWFRIjAdj9Sa/FLwL428Q/DnxHDr3hrUbjSNWg3LFdWzlXTI5wfpQB+r/7W3wb8KfsLfDRPiJ8H9P8A+Eb8Wfals/tm/wAz91Jw64I9CeleUfsf/ErxB+3t8RLzwP8AGe7/AOEn8N2lq17Fa7fK2yrkZyD7CsH9hL4heLP2nvjN/wAIf8Y9YvvHnhRrSSb+zfEDmW3EirlWGeh6dK9y/b98J+Hf2VfhPp3iv4N6ZZ/D/wARz3iWc2qeH8RyvCQMoT78ZoA5v9tTR7T/AIJ36L4Z1X4HRt4Wv/EtxLbapKx87zo4lV4xyOMF3/Opv2L9Dsv+ChmheI9a+N8f/CU3/h+eO10+T/VeVHIpZhx1yVX8q/OL4mfHb4g/GC1srbxp4u1TxLb2cjSW8d/NvWNmGGKj3AA/CnfDP46fEn4R2d7aeBvFmreHre7dZLmLTZCokZQQpbA6gE0Af0OfBT4G+D/gF4buNB8F6b/Zmm3Fwbp4t5fLkAE5P0r0J22qa/nQk/bY+P0JHmfFLxMm7pvuSP5iv2F/4Jw/ELxL8Uv2ZdL13xVrF1rerSXc0b3d2+5yoIxzSA+Jv23v26vjH8Jf2kvFHhfwz4l+waPYOqxW/kg4yMnk19J/Bb9jf4U/tHfCvwx8SvHPh7+1PFviSyjv9TvftDL50zgFmwDj/wDVX0n41/ZT+EPxD8QXWu+Jfh/outaxc/628vLfdI+OmTX48ftL/tIfFL4M/Hbxn4H8DeONZ8L+FdC1GSx03RdOuCkFnCv3Y4x6DNMD9xLTS7bwj4PNhpa/Z7bT7Ix26ZzsVE+Xv2AFfhvrH/BTP9oCy1a9gi8XIkaTyKoNsDgBiAOTXnv/AA2Z+0PNGyt8TPFkkTDDKbhypBGDkY5FeFzzTXVw7yFnmdizHHJJPOfekB9p/C39ub4xfHD4keHfAvi7xMt/4Z167Sx1C1W3VfNhf7y57V+nfgL9gT4MfDPxbpviXw/4aNlrOnSebbzCYnY30/GvxK/ZVtZ4f2ifh7LLFLHENWhy7KQBz61+5P7aPjbUvCH7N/jLVvDmqSWWsWtqGhns5AXRtwx0oA8r/wCCsC4/ZF1Pv/xMrb/2fmvxq+DHxw8XfATxVN4g8Gah/ZuqSQNbtNtz8hIJH6Vt/EL9o74ufErw3Jovi7xrruuaO7h2tb+TMe4dD+teTgMWJpgfqB+xnr99/wAFCPEGt6R8bpV8T2WhwrPp6ACLynY8tlevGOtfoX8E/wBmnwB+zyuoJ4I0f+yUviv2gby2QoOOv4/nX5v/APBF24ig8ceOfNlSPNmmN7AZ5FfrbDcRTq3lSJJjrsYHFJgfkF/wWi/5Kp4M/wCvCQf+PCvqT/gkP/yarJ/2FZ/5Cvlv/gtD/wAlU8Gf9eEn/oQr6k/4JDf8mqyf9haf+QqQPzy/4Kmf8nieJ/8Ar2t//QTXyTX17/wVEtZrr9sTxR5UUku22t87FJx8p9BXyd/Zd5/z6T/9+2/woANG/wCQxY/9d4//AEIV/Sd4b/5Nvs/+xZ/9tjX83elabdR6rZM1rMqidCS0bY+8Pav6RPDf/Jt9p/2LP/tsaAP55/gj/wAly8If9hmD/wBGCv6Y6/mc+CP/ACXLwh/2GYP/AEYK/pjp9B9D8/P+CzP/ACb34b/7DA/9Ar54/wCCMOs2GjfFH4gvf3tvZo+kwBTcSqmf3x6ZPP8A9evqX/grT4D8QePvgT4fs/Duk3WsXcOrCR4bSMuwXYecCvyUt/2dfi3aMWg8EeIIWPGY7d1J/KkJLU/oe1bUPBHiCYHU7rQtR2cL9qlglC8DONx47flVBdJ+Gv8ADb+FSP8Actq/n4/4UL8Zu3hTxP8A9+5P8aT/AIUL8Z/+hU8T/wDfuT/Ggdj+go6V8Nun2bwrj/rnbVs6frXhLSrMW9lqOi2cC8iO3niRR9ADX87n/ChfjP8A9Cp4n/79yf40f8KF+M3fwp4nPt5cn+NAWOo/b1niu/2r/H00MqTRNffK8bBgRgdxX7h/s7fL+zP4QILKy6HGQynBB8v1r8CJP2cPixLIHk8C687Z+81qxNfv98CdPutH/Z08MWV9byWl3DoipJDKpVkYR8gg0BY/BvxJ468RyfHnUIBr2qCFteMbR/bJCpXzum3IBFft58Y/A+gaf+zL4n1G20XT7a/j8OyTLcw2sQlD+SPmD7c5/Gvwm1//AJOEvP8AsYf/AGvX77fHH/k1LxV/2LD/APogVQWP5428aeK9aVrI61q18JjgwG7lcN7bd2P0r6O/4J3+FZbP9qjwvJ4j0doNKCTeZJqVsRCPkOMlhj868k/ZW1Kw0f8AaF8DXuqzxW2nQ6nGZpp/uKOetfq3/wAFDPjP8Nte/Zb8UWXhvxNot1qrNAY49PlTzjiVc4xTEUv+CmUej6f+z2tx4HjsrbVf7QhBk0EqswXcOnlc+tfkN4qvvGVxa+X4gm1t7bcGC6m0pTd2Pz9+tfUv/BMHx5o3hv8AaNN54u1iGy0v+z508zUZP3W4q2Bz3r6X/wCCrfxQ+HvjT4E6NaeFdb0fUr9dTRzFp7ozhMdTt6cg9fegD8p7LR9R1bf9js7m8CY3eRCz7c9M7R3wfyr9SP8AgkjoOgWPgXx+fFunWMM7XkHkrrESKcGM/dEgx2Fcz/wRXsre+8ZfE7zoYplFhZgCVA3WST1+ldT/AMFbPhj4v8WeMfBB8F+HtQvYhaTxz/2XCeu4EA7foevoaAPGP+Csvhe1vP2gtFk8J6XHcWP9hxiT+yIA8YcTSZz5YIBr7Y/4Jf6xYeGP2U9JstXvIdMvFvZ2MF5IInAJHYnNcF/wTb8QaN8H/gnrOk/FK+tfDevS6zLcQ23iBwkrRGOMB/n7Eg/lXy1+334N8V/FX9ojUte+G+nah4g8NTW0KRXWiKz27OM7tpX5fTpQB+1tnfW+pW4ntZo7iBvuyRsGU/iDX88H7b2D+2F8Tweh164H/j9fs5/wT/0PWPDf7KvhCw161ubPU40k82G6BDjLHrmvxi/bc/5O++Juen9uz/8AoZoA/cH4U+AfDEvwN8MvJ4f0tpm0SNjM1mhfd5WSd22vwS+FdvFP+0H4eikhjaFteRGi2jaV83BGPzr9x/hr+0L8MbT4K6FYXPjjRoLyDRkhlhlugrI/k4wQfc1+Gvwz1K00/wCPWg3l3OttaRa4skksvAVfOPJoA/dz9o7wX4f0n9nXxpfWeh6bZ3sejvJFcW9oqyI20HIcDI61+PH7D/ijWvEn7UngTTdV1a81GwubwrLbXMzSRuNrdmOK/W347/G3wD4y+BHirQdD8W6Xqes32lPBbWNtcK00smwHaq+vBr8uv2IfgT8QvDn7UvgTUdU8I6pYWMN4TJPPAVVRtPU/nQB95/8ABVHwT4e0H9lO+utP0OwspxqNuPMt7dUbB3d1Ar8WrHS7zVJfKsbSa8kA+5BGXP6Cv3Y/4KheEdY8bfstX2m6Fp1xql+2o27rbWyFmIAfJxXxf/wSv+C/jHwj+0fcX3ifwnfadp39kzr5t7bAR7yRjrSA+CY38S+Dd0kR1TQXm+XzFMluXx26jOM/rX6k/wDBGfxFqviDR/iAdU1K81FoZIQn2uZpNmc5xknrgfkK3P8Agrd8Kdc8ZeD/AAbH4U8Nz6lLDcyGZdPtslcr3x64OPoarf8ABID4b+Kfh/pPj5PEuh3mjNcSQ+St5EUL4HOM9cZH50mB43/wWi/5Kp4L/wCvCT/0IV9I/wDBJbxFpOm/svGK61Wyt5v7WnJjlnVGHC+p/lXjX/BXL4TeM/iF8TPCdx4a8N3+t28VlIjyWcJk2nI4OOnQ/lXwbb/s5/GOzUrB4I8RwA9RHbuufypAf0KX6+ANWu2ub7/hHLy4brLcfZ3c/Unmq/8AZXw0/wCfXwt/37tq/n4/4Z/+NX/Qn+KP+/UlH/DP/wAav+hP8Uf9+pKAP6B/7L+Gg6WvhUf8Atv8Kn8ZeKfDlv4B16GDWNMRE024VIo7iMYHlNgBQa/nx/4Z/wDjV/0J/ij/AL9SU1/2ffjRIpVvBvidlPUGGTFAGJ8Ef+S4eD/+wxB/6MFf0x1/O98Gf2dfihpPxa8IXt94H1q2tYtUt3kmmtmCqPMGSTX9D642jI5pjJBXCfFf42eCPgrYWN7411+20C1vZGigluScOwGSOB6EfnXcNXwb/wAFaPg94y+MXw78CWfg3w9feIrmz1SeW4isYy5jQxABj7ZB/KkI+sPhX8fPAXxqW9PgrxHa68LNgs5tifkyAe49DVP4n/tKfDf4M6tb6b4x8TWmhXlxGZIo7gkF1yASPzH518A/8E454/2QLfxbD8ZZE+HcmrSRtZDXQYfPAHJU+xA/MV4x/wAFYPix4O+LXxM8M33g7xFY+Ira1sDDNNYyb1Ri2QM/n+VAH6//AA0+MPhD4xaDJrXg7XLfXdMjlaF57UkjeOorj/Hn7Xvwi+GXie68PeJfG2n6VrFrjzrSZjuTOcZr5n/4I6qG/Zp1YkZ/4nMv/oIr5Q/b4/ZV+LnxG/am8Z694a8A61rWkXMsflXdpbl42xGucGgD9J/+G/PgH/0UbS/++j/hVfUv29PgLdabdQp8RtK8ySJkXLHqVOO3rX4tn9h748KCW+FviJRjJLWhAxXkureH9R0HWJtJ1K1kttRgk8mS2kX51fONpHrTA6zUNRttW+O017ZTLcWc+vCSGVejqZhg/lX7/fHL/k1DxX/2LD/+iBX4e+DP2S/jCuqaNrX/AArvXBpKSw3b3n2b92IQwYyZ9MCv1y+JX7Tnws8bfA/W/BmjeONJvvFWoaM+nWulJP8Avpbkx7RGF7sT2pgfggfvH610XgH4f+IPid4ktvD/AIY0ybV9YuM+Ta24y7Y64rvfEH7Ifxo8L6Pd6pq/w417TtPtYzJLcT2u1EUdTmut/YC8daD8Nv2nvDGv+JtTg0jR7cTeddXB2quY2AzTArH9gn4+f9E31T/vlf8AGj/hgn4+f9E31T/vlf8AGv2mX9tr4Dcf8XR8O5/6+f8A61P/AOG2vgN/0VHw7/4E/wD1qAPkj/glD+z18Qvgn4t+IVx438MXfh+DULKzS2e5AxIySSFgMHsGFfb/AMVP2ivh58Fri0tPG3iaz8PXF4heBLljmRRgMw+mQPxqz8Ofjx8PvjBc31r4J8V6b4knskWS5Wwk3+UrHClvTJBx9DX5of8ABbD/AJHr4d8kf6Dcf+hqDSA8a/4KkfGDwh8Z/jtoeteDNbt9c02LQ47aS4tySqyCWQlfyIr9D/8AglL/AMmm6T/1+T/+y1+N/wAP/wBnX4l/FzRX1Xwd4M1XxBp0UjW8lxYwF0WQc7SfXBFfrF+wt8WvBv7M3wGsPBfxS8RWXgfxTb3Mskmlaw5inVTjBIx0pgfeb/dyBnjpX4h/tdfsY/GLxx+0z8RNc0PwPqF/pGoavNcWt0i5WSMkkMPY4Nfqe37b3wHI/wCSpeHWGOf9J/8ArV6roHizSPGnhm31rRL+HU9KvoPOtruBtySqQfmB9OKQH8wus6Td6FqFzp99G9td2sjQywycFGBwRiqHNd/8boZLr42eMookZ5JNYuFVV6ljKQBXYw/sR/He6hjli+F3iCSJ1DKwtxgqRkEc+9MDmP2cfEGn+Fvjl4L1bVblLPTrPUY5ri4k+6iDOSa/e3wX+2J8HPHniHT9B0Dxrp+o6rfNst7eE/MxOcfyr8MNa/Y6+NXhrSbrUtV+G+u2FhbIZJriaABEUdSea6H9gVf+MuPh7xjN8fr900Afvh8Rvip4X+FPhl/EHirV4dI0hHCNdTk7cnoK8m/4b8+AY5PxH0sf8Cb/AArmP+ClXw48R/Ez9mW70Twno91rWrG/hlW0tE3OVAfJ6+9fj0v7E/x23MP+FX+IBz/z7fr196QH7zfC79on4dfGy5urfwX4ms9emtEDzJbkkopJAPI74P5VN8VP2gfAHwTazTxn4jtNCa7UmBZzguAQCf1H51+b/wDwTm025/ZD8ReJ7740W8nw4tNVgSOwn1weSk7gjIQ564/mK5H/AIKxfG7wR8XdU8Ft4M8Uaf4ljs45RM2nvvWIllIDH1I/lQB+h5/b6+AoOD8RdLz3yxob9vz4BohdviNpQVeTyx/pX88rD37YFej+A/2bvid8UtGGseFPBOra9pZcx/arODem4dRTA/oy8B/ELw58UfDlvr3hrUodY0m4yI7qHO1sfUV5r4q/bP8Agv4H8R3+ha1430/T9UsZPKnt5Cco3pwK5H/gnP8AD/xF8M/2W9C0LxRo9zoerw3M7vZ3abZFViCCR+dfjT+2uN37VfxM9tWc/wDjq0gP2xT9vj4CzTRRL8RNLMkjBEUseSenUV7euuWF1oq6vFcI+nNB9oE4+6Y8Z3fTFfzteF/2QfjLrSaTqtn8ONdvNLujHPHcxW2Y3jJB3Z9MV+9+m2c+n/ABba6jeG5h0AxyxSDDIywYKn3BFAHG6V+298Eta1e10yy8f6bcXt1KIYo0YkuxJwOO/B/KveNx7AkfWv5nvgv/AMlw8Hf9hm3/APRor+mNfuj6UDHLzXkP7Rv7T3gj9l/Q9J1TxvNexWuqTvbW/wBhtjOxZVDHIyOORUP7Tn7UPhn9lfwjYeIfE9nfXlneXP2WNLBFZt2M5OSK/LP/AIKFft0eCP2sPBfhTSvC1jqljPpOoSXMwv4lUOrIFGME8gg/nUEnrP7TFm3/AAU8m0u8+CrLPD4bDRXv9tk2Z3P8wwPm7Z7V8H/tDfsx+NP2ZdcsNK8ZR2aXN7D58X2OfzVIBx1wPavf/wDgnx+2Z4N/ZTsfE6eJ7PU759WeMxJpsSuVCqOpLDv/ACrlv+Cg37VPhX9qbxtomr+FbK/sraytPJkW+iVGJJyejGmM+8v+COj7f2atWH/Ual/9BFer/F//AIKK/CD4G+P9S8H+J7nV49ZsComW0sd6cjI53D1r4P8A2CP2+/AH7MPwfu/DPiaw1W61CbUXuw1jCGXaygDkkelbPxP/AGMfGf7fXjbUPjX4EvdM07wv4h2taQavK0dwAg2HcqqQOVPegD6jk/4K4fAB1/4/fEX4ab/9nX49/F7xppnjP41eIPElg8h0q/1RrqNnjw/ls+7lfX2r64/4cyfGH/oOeGf/AAJk/wDiKP8AhzL8Yv8AoO+Gf/AmT/4incD6m8Kf8FNPgrefDfTPCUd1rI1htMTTYx9gxF5piCDLZHGcetfK3hv9gX4r/C3x7afFPWrfSY/Cek339u3DxXe64FuH35CbeWwema1PDn/BHf4u6P4i0u+m13w35VtdRzttnkJIRgxH3Pav1R+IvgG+8VfBbWvCVq0K395oraekkrYj3+VtzwM4zQB8k/Ej9v74UftKeB9a+GXgy51ibxP4mt2sLCO8sxDCZW6BnLcDivixv+CRvx/Y8Wvh3H/YV/8AsK9q/Z//AOCVPxS+F/xh8J+LNT1vQJbHSb9LiWKCVzIVB7fJX6veXjHT8KoD8N/+HRf7QH/Pr4d/8Gv/ANhXmPx8/YW+KP7NfhODxF4yg0uPTpphAjWN75zb+Oo2j1r9wf2jv2ivD37MfgEeLPEtpe3mnm4W38uxRWfc3TqRXw98Z/jJo3/BULw/B8NfhlBdaTrdjL/aMs2uDyoPLGM/dzk8UAch/wAESuPGXxRX00+yP/kSWoP+C2H/ACPXw6/68bj/ANDWtr4KaFP/AMEn77V9a+KRGt2ni9I7Ox/sD94yGEl2L7iuOJBjr0NfOX/BQr9rTwp+1d4i8Kaj4WstQsU0u3kgmXUECsxZsgjDHjAFAH3R/wAEZ13fs0a//wBjDN/6Jirzb9uj/gnz8W/2gvj/AKl4w8KQaQ+kXFtDChur/wAt8qDnjZ715b+wL/wUA8Bfsr/CHUvC3ijTNWvb251SS9SSwjVk2MiL3I7qa+mv+HzXweJH/Eg8S475gj/+LoA+Mz/wSP8Aj8p5tvD+D1/4mf8A9hX2P8Lf25fhd+y38PdD+FPje41WLxZ4TtF0vUUtLLzYhOgIbDbhlcnrivsH4G/GbSPj98N9N8a6Fa3Vrpl7kxx3ihX468Amvzh/aI/4Jd/FX4qfHbxl4w03VdBj03WdSkvI1uJCJNrEYB4PPHtQB5L4i/4Jx/GT4ieKdQ8eaTbaK2g6vcHVbZptQ2SGB2Eikpt67e2a+6/BP/BTr4J6xrOjeFre41v+1Zmjsh5mnER+YAFI3bumR1xXnulf8FM/hj8NtAsvh9qOl67LrWj2y6PPPDAhgMyL5RIbdnbuHpXz5o3/AATQ+Jfwt8RW3xL1TVdDl0HSJ/7Ymhgnk88xA78AbcbsH1oA/U747eD9R+I3wb8VeH9JER1LVNOe3gWdyi7mA6nHHSvzS/ZZ/wCCbfxj+D/x88JeLNft9FXStMujLObfUN8mMHouzmvpH4f/APBVT4W+O/GWheFLHR9eTUNQuEskeaJBGHPGc7skcelfU/xf+KGm/Bn4d6v4x1iGefTdKh86ZLdQZCPYZFAHeLyM0N92vk39nn/go78Pf2kPiRB4M8PaVrNnqU0Mk4kvY1VMJjPQn1r6wk+7x2qQPzO/4LWf8if4EPcXMp/SvgL9nv8AY/8AiF+05b6pN4IhsZRppAm+23PkgZ6Y4Oe/6V+tv/BQz9kfxZ+1ZoPhjT/Ct5p9lNps8kkz37soIYDG3APoc/UVT/4J5/sd+L/2T7PxVD4pu9OvG1RkaOSwkZsbfXIHHNMD8hf2gv2ZvGn7MuuafpPjaGzhvb6IzRrZ3HmrtBAOTgY6ivtr/gn/APt8fCn9nL4GL4W8X3OqRar9uluCLKy85drYxzkV7t/wUH/YV8b/ALVPjrQdZ8Malpdlb2Nq1vKl/IynJIIxgHjivyr/AGjP2dvEH7M/xA/4RLxJd2V3qH2dbjfYuxUK3TqBQB/Qf8E/jR4d+PngG08YeFnupNGumaONruHypCV65XJ9RX4FftrsB+1Z8S8/9Bd+2f4Vr7H/AGMv+CkXw5/Z5+AOjeDNf0vWrvU7SWWRntIVZMMRjkkelfCH7RPxC074sfG7xf4u0mOaLTtWvmuYUnG1wpAHIHTpTA/U34O/8FRvgb4F+FPhPw/qt3ro1DTtOht5hFppZQyrg4O7mug8Uf8ABWH4Caz4W1extr3XRcXNpLDGsmmMAWZSoyd3HWvizwX/AMEl/it8QvCGj+IrDW/D0VnqNslxEk00gcKw4z8lXtY/4I9fFzQtJvb+fXfDjQ2sEk7iOd9xVELHGU9qAPk/4JuJfjf4LYHIbWbc5xzzKK/piHQV/M78FLc2vxu8GRlldl1i3BZDlf8AWjpX9MDdaRR88fttfss3P7WHw50zw1a6vFo0lnefavPlj3j7uMYxX5N/tlfsG3v7I/hfw9q934lh10axdvapHFEyGPYgYk5HuK/V39ub9qfU/wBk74aab4l0vRrXW57y9+xmG6dkVMqTuyPp0r448F+Orn/grjeXHg7xZbL4JtPCgGpxXWk/vWkaTMe1g/b5O3rWZFj5Z/Y0/Ypvf2ubXXXs/EEOhnSHUMZoy+/cOMY/GvpY/wDBE/Wzkf8ACw7Lr/z6v/hWn421Bv8AgkjMlt4TVfGw8UDzppNWPktCY/lAUJ2I9fSuZH/BbDxiAM/D/RiR1/0iSmhmj/w5N1vgf8LDsh6f6K1fob+zH8F5v2ffgxoPge41FNTk05XDXUaFVbcS3Q/WuR/Ye/ac1L9qz4V3nizU9HtdFmhvmtBBayM6kKOvNfRDLuFUB+f3x6/4Ksad8D/ivr/gqTwVPqUulTeQ9wtztDEe2K4Af8FstJH3vh1dN/u3a/4V6p8b/wDglN4W+OHxR1/xre+MtTsbrVZzNJBDEjKpI7E159f/APBFvwZY2c8y+PNWcxxs+0wR4OFJwaQGb/w+00f/AKJzef8AgYtdL8Nf+CwGkfEXx9oHhpfAd1ZPql5FaLO10rBS7Ben41+SXjTQU8L+LdX0iORpo7K6kgV2GCwViAasfDvxlN8PfHOh+JYLeO7n0q7ju0hlOFZkYEA/lTA/p+TPIPPP5e1eXftMfHKH9nP4Rar45n01tVisWRTaq+0tuOOuK+E/gp/wVr8WfFH4reF/Cl34G0qyttWvVtnuIrlyy57gdK+jv+CoDZ/Y78XAjBEtv/6MFUB+fn7Y3/BR6x/ak+FB8HweFJtFf7Ulz9oeff8AdOcYx7Vof8Ebj/xkVrI9NIcfzr4H7/gK++P+CN//ACcZrP8A2CH/AK0Ae2/8FuP+RL+Fv/X9ef8AopK+R/2Nv2EL39rzRNe1G28SxaEmlzpCyyRFwxZSc8D/AGa/Wf8AbD/Y70f9rrSvDljq+u3mhpos8s8b2cSuXLhQQc9MBf1qT9kP9j/R/wBkfQ9f07SNdvNbj1aaOeRryJUKFVIGMdcg/pQB8RN/wRM1Nm/5KPa/+Ajf4Un/AA5N1JWH/Fx7X1/49G/wr9VLy+gscGeZIc9N5Azism48aaTajMl2hH+wQ1AHG/sv/BWb9nz4M6J4GuNQj1STTVKm6jQqHzjsa9UkX92/0riIfjL4NkvhZtr9rDcscLHM4Qn2ArqLi7F/p5ksJYpt6kRuTlDx145x9KB6n81/xgvPsHxw8WTld6x61O5XpnEpOP0r9FbP/gqZp3xk0m2+GqeDLixl1yFNKW++0AiMsoXfivnD9rT9gn4nfDPxxqfiWeyXXPDOoXrTvqWlAssAkk5DA8gjd36819jfDT/gkP4T8M6x4b8U2/jjVXu7N4b0W7W8YXcAG2k9cc0CPM4P+CaWpfs73w+LF14wg1KDwyf7XNgsJDyhedufxrnf2gv+Cq+n/Gr4Q+I/BUfgufTW1a28j7WbgNt5H8Jr9J/2qYfJ/Zo+ICHkro0i/kAK/Ab9nH4UWnxu+NXhzwXfX8mm2uqXBie5iXcyjBPA/CkB9A/8Em2B/a+0rH/QOufr0Wv3XH3RX5d+KP2WdL/4Jl6Q/wAavDetXPi7VLVhpy6bqEQijKzdWypPTaK4pP8Agtd4zX73w90Vzk/N9rk9PagD9d2xxx+tfLP7Zn7clh+yLN4fiufDc+vf2sruDHKECbcYHP8AniuW/YT/AG7Nb/a38ReIrHVfDdjoKabCskZtJnk3knnO7p/9c12n7YH7EejftcTaLJqfiC80V9KDCMW8avuB9c0AfLDf8FrtIOf+Lb3pxx/x+LXwr+2J+0lb/tQfFo+M7fSJdFH2ZLb7LI4cjbnncPrXVft0/smaV+yb4w0LRtL1u51uO/t2md7mNUKEEDAx16n8q+Xn7UwPuv8AZl/4Jk6l+0Z8IdN8cQeMYdJjvZHj+ytCSRtxzn8a+TPjR8N3+EXxS8Q+D5Lxb+TSLo2xuFBG/ABz+tftp/wSy/5M68Nf9fNx/Na/IP8Aba/5Ox+Jv/YXf/0FaAP3m/Zn/wCSA+Av+wTB/wCg13XiXRxr3h/U9OV/Ka7tZbcSEZC70K5/WuE/Zn/5ID4C/wCwTB/6DXeeJdUfRfD2p6hGiySWttJMsbZwxVS2Dj6UhH5m+CP+CP8AqnhPx1o2ut46tJY7G9juvI+zYZtr7tufwr9Qdp/r/nmvyp8C/wDBYHxZ4s8faLoUngXSoI9R1CK0aZLiQsFdwob9a/VVW3Kpb5WxyAehoK6nwJ/wWW/5N88N/wDYZH/oBrwH/giq234sfEL/ALA8H/o1j/Svfv8Agst/yb74c/7DK/8AoBr8p/g78f8Ax1+z/ql9qPgbXJNEur6JYLh441feoJKg5HbJ/OpsT1P3Q/al/Yt8IftWXWjT+J9R1DTzpSMkX2FgN4JJ+bI7dvqa8A/4c1fCXp/wkXiDI4+/H6fT3qx/wS9/aO+IXx+svGL+Otfk1s2LxpbmSNU2ZALdBzXJ/wDBTz9qj4m/An4ieGNK8EeIpNEs7rTzPNHHGj733EZ+YHtQM8++L3xv13/glz4ki+Fvw2t7XWtDvYRqz3GtAPN5j8EfKenHeuG/4fNfF/8A6AHh7/v0/wDjX0F+xj8LfDP7dvwtuPHXxs0//hMvFVpevp8WoSMYSIFAKrtTaO9e+/8ADtL9nf8A6EKL/wACpf8A4qgD4Dj/AOCy3xekYA+H/Dx/7ZPnr9a/WH4X+Mr34hfBnRvEeoRxQ3upaX9oljh+4rFDnFeNf8O1P2eF6eAo8/8AX1N/8Vj86/NH4hftq/GP4YfE3VvA/hvxdLp/hbS706faaeII2WOEMAF3bc9Ce/egD5e+L3/JVPFn/YTn/wDQzTvg94RtfH3xS8LeG755I7TVdRhs5Xi+8quwBIr9uPB/7APwL8deEdH17XPBEF3q2pWyXt1ObiVTJLIAzNgNjk103h3/AIJ5/Abwn4g07WtK8Ex2moWEyzwSrcyna68g8n2pgea/Dj/glR8Nvhn460PxRpniLXpb7SrlbqFJimxmHY/L0rrf+CoH/Jnfi4+stv8A+jBXr/7S3izVPAPwH8Z+IdGums9T0/TpJ4JlGSrAcdc1+FPxL/be+Mnxc8I3/hjxV4vl1PRL3b51s0EahtpyOQo7gdaoDwrv+Ar76/4I2qx/aI1twpKrpLZbHA5NeW/8E5fg74S+N/x9/wCEe8Z6Sur6V9hmm+ztIyDcqHHKkelfsb4M+Evwx/ZP8H6vfeGtGtfDmnEeddSqWZ3wCFXcxPOSQPqaA6o9b1LVbfT7Vp5n+Re6mvPNX+IV7qEjx2OIIOgfHNcFpvijV/HCDVb6L7LHcgPDahsiKPnA+pGCfwp+ra5Ha3mn6ZCAbq5kzycfKuN3/oQpHr0cKpas2rq6kc+ZcSNKx6sxpvkpIoKjOa4Txx46Nvc2tjZgBpLny3YHOIxjd/MVo6b4g87w9dztcb2sZjuf/ZBHH60XPSWHVi74o8C6T4ssXttRso5Yz/HtAZfdT2NfMvjGTx/+zV4giv8Aw/rVzJojSFo47hzJERx8rD8a+upL61ntZHEo8vapJXqoI4NcRrVlp/iLRNU8Pa0izlFZdz9Vz91/woOOph73F+CP7Zfh74rGPRPFNvDpOtSAIEYb4Z29j+X517x8SPEF54O+HfiDWNLhSa90+xkngiZflJVcgY9K/IH4peFbv4e+KprCRpIfLbzYZhwWXPysDX25+xL+1QfH1uPBHim4WTVoYsWl1If+PhBwUPq2MfhmmeVOHK7HyLon/BSH4iftDeKrb4XeIdE0qy0rxJP/AGTdS2sbidI3OGx719bfCH/gl98Ovg/8QtG8Y6Tq+uXGpaXL5sMd0y+UTjGMdehNeBftNfsm2/wi/bF+GXj7w7bpB4d1/XI1nt4VCx2txySqj0bJP1zX3J+2B481v4Z/s3+L/E/h68bT9V0+z82GdVDFenrSMTb/AGiPgHof7Rnw5n8H6/cXVrp0syTNJZnD5XOO3vXyf/w5p+EPfxB4hHb/AFqf4V8Av/wUs/aHX7vj+Yj/AK9Yv/iab/w8q/aHY/8AI/SE9f8Aj1i/+Jpgfrh+y/8AsQ+Dv2UtU1a+8MarqV9JqSLHKt8VIAB7YHrXm3/BQz9s7xf+yjqXhWPwvY2F7HqiO1wL5ScFScYx7fyrgP8Agl9+1F8SPj94l8V2vjnxC2twWUSNAGiRNhJ6/KBn/wCtXnX/AAWsJXWPAH+7IaQGv8H/AADZf8FTtMvvF3xMnm0bUdBf7HbQ6GNqlWyTu3dT8o/M18Xft3fs86B+zR8aF8JeHLu5vLD7DFceZdEF9zZz0+lffH/BFtt3wx8aZ/5/4/8A0E18sf8ABXhdv7VBPrpkP82oBn6H/wDBLME/sc+Gsf8APzcfzWub+Kn/AASx+GvxS8fa94u1PXdct9Q1a5NxIkBQRqSOnTODXTf8Esf+TO/DX/XzcfzWvrGaPqcZx+vtQSfj3rH/AAUs+IvwM8TXHwz0TSNHudF8N3P9lW09wj+c0aMFBPPXmv1LXX5/FPwVfV7pBHc3uiPcSLH90M0JJxXkviz/AIJ//AvX9W1bxDfeC45tXuJHu3m+0yjMgGc7d2Owr8qfH37dHxo8J6z4j8Jaf4ylg0Czmn0+3s/JjKpbglRHnAPTPXNMDwr4K/8AJbvBn/Ybtf8A0atf0uN941/M/wDA+Uy/GzwS3rrdqemP+Wq1/TFuoKR8Df8ABZb/AJN88Of9hlf/AEA18n/8En/hT4N+K3xI8a2vjHQrHXYLTTYZLaK+XKo5kYEjkc4H6V+zPiTwjonjC1jtdc0q01a3Rt6xXkKyKD64Ir86v+Csmkw/B/4f+Br7wFbL4Uvr3Up4rmbRk+ztIgjGA23qMnjPqaRFjj/+Ckk0n7KV74Si+Dv/ABQNvqUUhvk0T5POIJ27uTnr+tdb/wAE6NAsf2p/A/iDVfjFYp491ayvfItLrWh5jRRbFOAPTP8AKuf/AOCVMZ+MWn+NW8eY8WNayRrbHWv3/l/KOF3dOT2r9LfDfg/QvBtvNb6FpVlpMUr75Y7GJY1ZueSB3pjPyO/4KIeONf8A2V/jVZeFfhLq1z4B8OTaZHdSaboshihMrMctj1NfoF+wD4z1v4gfsq+D9d8Q6lcatq9ykvm3Vw293xIwGTX5wf8ABY7/AJOd0z/sCQ/+hNX6Cf8ABNN1X9jfwJuYL8k3U/8ATQ0gPzl/bU/ae+Lvg/8AaY8baTonj3V9K0y1u9kNrbTbURcdhivjbVta1LV9Xm1TULt7vUZpfOkuX+87k53E+tf0rat8KfAmvahLfal4W0W9vJfvzzWkbO2PU45qqPgj8Nz08F6D/wCAUf8AhTA/B74f/tbfGWPxF4e0uDx/rI09LiGAW3nfJ5e8DGPTFf0E+FbppvDelSTyGWV7SJnZjkligJNefeM/g78P7DwnrM9v4S0O2nisppI5EtI1dWCHBB7EV+A3ib41+P7XxJqsMHjPXI4YrqWNI47+QIqhzgAA4AoA/o98RaFpfi3R7vSNWtI7/TbyMxT20y7kkU9QRXkqfsU/Alenwx0Af9u+P61+NH7JHxc8ea3+0Z4Cs73xbrV1ZyapEJY5ryRlIz3BNf0AedFnaZUyD/eGaQHmXg/9mj4afDnxBb6z4S8Jad4e1CPIaeyj2M6kfdPPNfO/7Ynj9/Gvxe8JfCezn22XnLe6l5XBcDBCH6cn8K+1ZJUgjeQsCqKWJ49K/LrwPrk3xC/bK8a+IZj5kNhLNBE3YLGvlr+lM6sNT9pVSPsGG6Fmba2gKqSCBH0+UDn+deR/8Jss3xK1i/aUNDp6G2jz3IUtIR9Dx/wKun/4SBLjUr6+csINNtJCdv8AfYY/XBry3wb8N9aW+0i7vVIn1m8lzG/RY2CsSfr/AErGT1Ps6dOnTj7x2fw28G6jrHg3WtX1KRmv9RikFor9VXJf9TzXJ6D46bQdcuG1AY0jWoBBMx6ecuVcfiDn8K+irOO1tVjsQVDxoNibsAAccV5v4i+Dr6xfa5ZPFG1heo01vKTu8uXucfj+lZc2pjCvTUveOM8M/EZvDWrDQdYm2qM2wnHR42/1T/hTJviZu1CKK/bdf6dO1ndrnHnQPgK36ZrlPEHwj1yLQ5tP1iSB7y1k/wBHuGcfPHk/Lk/T9Kr6r8JNb8SeDLnUpJrWPUdPi3GeGYMZol6k46dMVspHqxlQkvdMf9pTwyt94eS9L+de6VN9nL5z5sRGUb8sj8K+X/DPiy/8G+KLDW9NlaC+s5lkhf0IIP8AIEfjX1r8QJhqmj3kB3LJcafEzgnPKpjNfFd0/lySDtGxXr9arm1sfI5pSVOpeJ+xXiG6j/aU/Zck1PSpPK1e5sPttlLH/rLS8jXgr6MDnH+9X5Xfs0fGb4nfEz9pLw38P/iF4t1fxBoF5ePZajo+pTbo5VGQUda/QP8A4Jn+MG1r4R6posz7m0u82op5+R1/xzXxD4Z8Mf8ACI/8FUorBY/Lj/tx5VGOPmUmqPEP09/4Yt+Bzf8ANMfD4+lt/wDXpP8Ahi34HDGfhj4f/wDAb2+te2mkxTA/MX/go/p1p+yT4f8ACt/8H7aP4eX2pzvDeT6J+5adQOAx5yOv5mvzU+Inxk8c/FxrRvF/iLUPETWpPkNeP5nlZ4IHHoB+Vfpp/wAFqv8AkT/Af/X1J/KuR/4I9+B/D3jLT/HY17RbHVxDJEY/tkKybDjBxkcZH8hQB8CfD748/EP4S2E9n4R8Val4dtrghpY7KTYrsOhPHX/GsLx98QvE3xU1z+2PFWtXWu6ns2G5vH3PtHQZr7d/4K/eE9F8H/E7wlaaHpNlpFs9g7tHZwLHuO4DJwOeP519If8ABLH4b+EfFX7NP23WfDWk6te/2nMpmu7dXfAxjO7pQI9S/wCCW8nlfsd+GcjP+k3HH4rX5wftYftXfGLwf+0f8QNG0P4g65p+k2epvFbWtvNhI4wBgAY461f/AOChnjLX/hr+05r3h7wbq+oeHdDit4XSx0uZoYkdlbJCr0zjtX6Yfsm/DjwX4x/Zz8A6trvhzSdW1i60yOS6vL+2SSaR8nJZmGT+NBJ+M7ftm/HWZWjk+JXiF43G1labgg9e3pXnHh6afxF4+0t79zczXmpRNcO3LOzyKWJ6cnNf0ef8KL+HJ6eB9AP/AG4Rf4Vj+NPgz8PdL8I6zcReD9CtJ4rOaWKaOzjSRGVCQVOMgj2oAx9F/ZJ+C2m3VjqNh8OtCt7u1ZZIbmGH5kYDqDn3r2pS2OBx7V/Oz8GfjR45uvjV4QtrvxdrM9u+sW8TQNfSeWF8wDbtzjGPSv6H0mMSKmx3wB827rxSKH3WoW9iu6eeK3U9DK4Ufqa5/wAReH/CnxGto7bVrDS/EMUBLpHcIlwEJHJAOcdB+VfJH/BWLRfFGt/A/QoPClpq15fjVC0kekJK0mwRkknYOnHevnT/AIJb32ufC/4heNLv4nXepeGLG40+FLGfxVJJbQySCRshDMQCcHt6isybo0f+Cr08vwT1LwUngEr4PS7il+0f2Li2MuOm7YOf4sZ9TXqn/BIjxlr3jT4Y+LbnXdYvNYmj1EIkl7O0rKNgJHP4flXg/wDwWH8deG/GeoeAj4e13TtbEEcwlbTrhZljyTgMVJGSB+lexf8ABF4f8Wj8XZ76nn/xwVZR93eKPhb4Q8Z3wvde8M6ZrF2E2rNeW6yMB6fMK/FP9vf4g+Jvhj+1B4s8O+ENe1DwzoVo0Yg07S7hoII8oM7UXAHSv3ZbAr8L/wDgov8ACfxt4j/a28ZahpXg/XdUsZXjCXFjp000bYQZwyqaZJ8+Q/GT4u3Gx4fFviiZT0YXMzD+df0AfAu9v7z9nvwvc6hNcTag2jI7yysfNZvL6+ua8M/Y68Q/DXwP+zn4M0XxheeGNF8SWtri7s9aaCK6jkJJ+ZX+YfiBX1ppdxYX2l20+mPBLpzx74XtwvlMnquBjH0oA/nk+K3xK+KjfEDxTbxa/wCJvsRv5kEIlm2FA5wMdCKxP2ffDd3qHx68EjWNPnezm1eE3JuYD5ZUuM7s9vrX9Et54V8OIslxeaLpexBmSaa2jOAO7EivBv2ivHfwjj+CfjuLS/EHg5NYXSrlYFtbm3+0CTYcBdrbgfpTAqftO+A/hv4X+BHjPVvDuj+H9J1m10+SS2vbBIo543zwVZfmB+lfidD8ePijczeTF408RXMp/hjvZWbP864+68Va5dwyRTa3fzwyffjkunKsfcFq96/4J46noWkftVeFrvxHd6fZ6WizeZLqbKIc7DgHdx+dAH6v/wDBPfWNY1z9j7Tb3Wry8vdWb7WHkv3LSk9s55r5L+DurQeGdT8TIF23N9qFxNM3oN5Ar9OfBviXwn4p0uZfCmp6RqdjGdkg0iaN40Yjp8nA6fpX5gax4RvfC3x6+Jvh4rhbZpLqAH/nm53LQe1lP+8I9RHim6uvAN5qFvGZZ9Su1UKv8UcZwa9S8QeINc8T2dpbaHcro9q9tHM9+q7mBxgqF/CvD9e8O6iNB0mLS7h4LzS4RL9niOHdmAL49sEZ/CvcPgjqUOqeFksVLPJACv74bSO7DP1rmqXPpcfTdTYyfh94U8TWviwyT6vLdW0eVZ5E2F++cfjXvDIF4PJxyT3rO06xjt+VBQg9Cc1flYsc9a5E9T55p3PNvip8ObPxlGrTec8p4jTzNsYbjrXnFr8LD4R0m8FneSQ+aDHLAk2YypBH6Z/Wvoe4VWjIYMe/y9a8U+MF5qT6RPK3k6dpCsELFsStnrj8q3izswtNzqXR87fFDXUsbvU5Ym8y2t4Vt0fOQcLg4/AV8mXl0ZJJ2/vFm/Ovtj4x+A9LX4I6zc20QLskVzvkf5icNzXwtdXIVmJ6AYq1ucuaVH7RRZ+jP/BKeQyL43XPy7oiRX3I3wx8KN4i/t3/AIR3TP7Yzn7etsonz67+tfJf/BLXwPPoXwh1vX7qIo2s6hvhf/pmikfzJr6rtvi94JvNb/si28W6LNqhcp9ijv4zNuHUbc5z0rdM8M7IVDd31vYx77meO3T+9K4UfrWfr3ijSvCunvf63qVrpNghAa5vZlijGemWJxXw/wD8FL/Hll8TvgDb6V8N9fh8Ta6upwytaeG7v7RceWActtiJOKoVjgP+CykieIPCPgUaYf7RKXUhb7J+928Hn5c+lZ3/AARrYaDYePv7TI07e8W37X+63cf7WK5v/gmW1x4J8VeLJvi4s2jWFxboLN/GOYo2YHnb5/U4Pb2qn/wVe+IHhpr7wUfh/r2mmNY5Rc/8I9cKBuzxv8sgdOn40x2Mf/gsnqFrqHxa8IPa3MVyq6ewLQyBwDuHGQa+JfCPj74geHdLFn4b1nXdP0/eW8vTZJEXcTycr3rltV1i+1iVJb6+uL11HDXEpcj8ycV+un/BL3xV8N9H/ZrFv4q1bwvZaiNSmby9UkgSXaQuCdxBoEel/sA/DvRPiV+zNoOueOfD1rr/AIhllmSW+1m2Es7qD8u4vz3Nfm3+1V40+InhH9ozx7pHhvV/EGleHrLVXjs7Gwlmjt44sDARV+UCv2qtfjZ8KtLhEdt488KWcQ6RQ6pbhR+AauittD8MeJrNdStbLStVguF3JdxxRyrKMHB3DrQFjivgf4sgb4C+FJtQ1eN9UbRY2ka4uB5xbZ3zzmvw1+LPxJ+KrfELxRHF4g8UNY/bp1j8qefy/L3t0xxjFdV8cPh58V1+PXio6f4f8YLo/wDbEhh+y2twLfYGHKkfJjFfrNofjP4Vr8EoLG71fwkmunRTby2s01ut01x5GNpUkMXz1pBY/DX4Huz/ABs8FlxhzrNuWz1z5gzX9Ma/dFfzs/Cf4JfEKy+NXhW8l8EeII7SPWYZWnbTJRFs80HcG27cYPrX9Eq52j/ChksWvzf/AOC2RI+FHw9G7rq8/wAvr+6FfpAeK/N3/gtl/wAkt+HOf+gxP/6KWpZCPzF+FnwC8efGj7d/whfh6511bLb5/wBnH+rz0J/H+Vfpb/wT+8Sab+xr4H1zRfjHeR+B9U1K7FxZ2uoHDSR7cbh+OfzFeE/8Eyv2rPh1+zfY+LY/HOqTae+oSRvCsUDSbtoxzjpjj865L/gpZ+0X4I/aO+IXh/VvBF9Nf2NjaeRNJNA0fzE5GM9ehoRaP2h+GXxc8JfGTQpNZ8Ha1b65pscphae3bIDjqK69hlfevgj/AII7Ns/Zp1QDvrU3/oIr2n4pf8FAPg38GfGuoeFfFOuXdnrNk22aGOzaQD8RVDPzZ/bQ/ZD+Lvjr9pbxnr2g+CNS1PSb668yG4gjyrLjH9K/QL4NftcfCH4X/Cvwv4V8T+ONO0jXtKsY7W8srhyrwyKMMpHsar/8PU/2eSP+Rmvwen/IOevxY+OHijT/ABl8XPFeuaXL5+nX2oSzwSEEFkZiQSO1AH7oeJP24vgZrXh7U7Cy+Imk3F5dWskMMKynLyMpCqPckgfjX43+Nv2N/jJZDXPEdx4D1OLRojJfNeMn7sRFid2e4wa8X8OXsNh4i0u6nYxwQ3UckjAZIUMCePwr9iPip/wUb+B/iT4C674WsvEN22rXWhNaRxGxcKZfKAxu+tMD8YmG04rofAPgHX/iV4kt9C8M6bNq2rz5Mdrbj52wOcUngrwTq3xG8W6b4c0SBbjVNQmEFvGzbQWPYk9K+6P2cf2WfiD+xX8WtJ+K/wAVNLt9K8FaSsiXdzBcrMyl1Kp8o/2iKAO2/wCCbvg/4k/sx/Fa4sPH/h++8PeGfE0a2Mc97hYvtIJMYz6knH/Aq+x/j98IbOTxlL4xtoR9r1O3TSbnb3G4kN+WPyr5F/b0/by+Gfxc+E2n2Hw81+9m8QWepwXsYe0eIDy3Vgcn02549K+v/wBj/wDaU0T9qz4M2t1dNF/wkNkq2+qWhOWEyqP3n/AsE0HRQqujUUkfNfx+s20vw/NqOk3DItvMscrr1DKAB/I1yPwr/aa1bQNWsLfVGivLRX2yTMNj7Tj869m+I/we1nSYfHGhaurTWmpMbzTruP7pb5jt/Divhi6Y6fLKjNhozhs9sHH9DWco8x+g0alGrRT5tz9WdH8RWXiKzhvtOk8y3mTckqnK/SuY1zxlqVjeNFhEZOnoa+EPhH+0ZrPw/wBQW3sb4XVqzYa0nOU/D86+sPDX7SXgnxVYq+tFdOu1++s6cE+1cMqTucqpUottLmPTfCOparfXFxeX9wTZlMLGy4CHnn3/APrV82ftLfFK18R6tFoulzeZZ2ch8xx0Z8cgfTFYXx7/AGtojbvo+ghrDTW3L9qP3mHHSvDdBvJ/El3D5EnnR3DqpJ6klhyf1rSFGW48POjTqdmfXPiSwTUfhXBpTR/8fujME9yEz/Wvzt0PwfqHjTxrZ+G9NhM19e3Qt1VeoJbbn9a/SS30fUvGvibQ/CWhRl77T1U3UxHyJDtHU+vXH0NereAf2dfhP+zfrFx4tkVRrs+6T7XeSb9pPUIO2c8/QVp8O58pnNenTftHJI6TVdDX9nT9lHUrHTJMzaHokiI/dpSmC31ya/Gn9h28l1T9srwNfXG43FxqkjyE/wB4gk/zr9nNS/aW+Herwy6bfTfaLWdDHMksG6FlPXPtXIeH/wBl/wCCWvePtC+IXhLSbbSda0uYTw3GmMY4ySCPmX8+vvTU43sj5SjmmFry5IVE2cd/wVoA/wCGSL//ALCNv/7NXwr/AMEf1/4ykuv+wNcf0r7l/wCCg0rfHDwnJ8EfC8E0/jy8li1G3huUMcEkKZ3kSHgkbh+deKf8E6f2Jviv+z78d5fEnjPRrax0ltNmtxLHdJId7dOBzWqZ6fMeh/8ABVb4I+M/jN4X8HweDfD9zr9zbXMjTR2q5aMEYB/Q/lX5NfFL4E+OvgtcWkPjXw7d+H5LwEwJdrtLgYyR+Y/Ov6XUUqF5xjjrn1r8pv8Agtef+Jx8P/8Acl/kKq5XMfmA3BOeTXqXw3/Zb+KHxe0E614R8I32taYJDF9ot0yu4dRWv8D/ANj/AOJn7RmlX+peB9Jh1K1sZRDO01wsW1iMgDd171+iv7K/xy8JfsC/DNfhr8ZLy40DxYbl777JbwtcL5T4CncOO1O4cx+fv/DBHx5H/NOdW/791+4P7JvhPVfBH7OvgXQtaspNO1Ww05ILi2lGGRx1BryJv+CqH7PXUeJtQbHb+znr6b+H/jnSPiX4Q0vxNoUrz6TqUIntpXTaXQ9Djt0oKRq6lC8umXkaDc7wuoUdyVOBX4ReI/2O/jHD8Zr7xBN4H1E6RHrbXzXYX5PJWbd/IV+9dYPj7/kR/EP/AGD7j/0W1MZ5BoX7anwT1jUrDTLH4gabcXtw628MSvzI56D6mvdftUXHJ6Z6V/NR8FB/xfLwZ/2GbX/0Ytf0sFRx9KBnkn7TP7TXhv8AZc8I2fiLxNa3l1Z3Vz9mRLNctu2k1+V//BRD9uLwV+1d4L8K6T4W0/UbO40q/luZmvUwpVkCjH41+kP7cn7LupftWfDnTPDematDo81pffajNOhZSNpGK/Jn9rz9hLXf2R9A0HVtU8RWetQavdSW6JbxsrRlVDZOevWkZHK/sw/sX+MP2rodYl8LXtjZrpbKs32x8ZzzxzXvX/DnH4v7dv8AbGhn6y8fzrif2D/22dF/ZFs/E0WpaDda0+qyIyC3cL5e0dOa/Vv9kf8Aa00r9rLwzqms6Xo1xo0VhcC3aOdwxYkE5GPp+tA0Yf7Av7NfiP8AZh+Ed/4W8T3FpdXk2oPdpJZtuTawHB9+K+WP2wv+CafxK+PHx+8R+NNB1DSIdN1EoY0uZtrjC45FfqFvGK+Iv2hv+Cn3hf8AZ9+K2r+Cb7wpfajeacVElxDOArZGRgEDFMZ8Z/8ADnL4xf8AQV0H/wACKZc/8Ee/jBa20s0mqaGVjUuQk+TwCa+hx/wWk8GzMAfA+pg56mdfWvvrwN4sh+J3w703XbWBrKPVrPzY45CCU3qcZpAfzUX/AIRurDxdL4ekeP7ZHefYiwPy7t23OfrX134o/wCCVvxT8JeAdQ8WXeo6S+n2Vi1/IkcuX2BN/wDKvd9W/wCCRPiy/wDiHc+I4/F2nJFLqP20QvDk48zdjNffH7QFg2l/sw+NrN2Dtb+HJ4iyjAO2EjP6UAfz+fAX4gWPwt+MXhXxVqUUs1jpd6lzKsPLEDjiv02+Kf7YPhD9vzwjdfBbwHa39h4l1xla2uNSTbAvl5dtx+g/WvyFr2L9k343WX7PPxs0bxtfWEuoQWKyKYYWwx3KRTFc+mf+HO/xhbpqmh4H/Tfp7V6b+z5/wTz/AGhf2dPiBbeKPD2vaLEy4S5txP8ALcR55U/mfzrsv+H0/g5P+ZH1Q5/6bD+te2/so/8ABQrw/wDtWeOr3wxpnhu+0i4t7U3PnTuGUgHpgUFI+kLnT7TxBpdnp/iKG2W8uocNbB8/MANwT6ZH5ivir4+fsQ6ra32pav4Rs47+xuCZGs14ljz1x65/pXtP7X37O/jb44XPgfUPAnjBvB2reHrqac3KkhmDquACOuNp4969J+COg/Efw/4UNl8Sdc0/xDqsTKsV9p8JjLoB1cHq3SqjoDlPZM/FLxN8OPEfw48RMBYXNrLuJ8u5QjoeRk/WrC694ougMaQsanhS0+VJ9cV+6WteD9G8SRsmraVZ6ip6/aIQ/H4ivLtY+EvwK0nU54NS0zwzY3u0NJBNcrEwBzzs3cZolq7npYXGzw8bM/Hw+B/FHjS6ggYyT3gztt7dC4UHGen0r6b/AGff2ffE82qWEEOjXBtoCHlnmQqobIx1+hr9Gfh78PPh/odit74R0fS0tZvmE9oFdT+OTXXXyyWtjObOCIziNvLjbCqzYyP5VadlY4q1fnqqojgNN8L6X8H/AA1rWuCNDeSoJbmXGS21TtX9a+LvFviHxF8TNdvtRKyXqxZkEAOfKU9OPw/SvqfwP8QG/aL+DOsyBbePU0muLC5t4GyqyRsQPzxXyv4b126+FvjSCe4gZJIC0U8K/wASg15GLvGPMfjvG1StUnTjObjT6lTw18PfEHjCQQ2OlzsDgmaQbETr1Nej+Fk0/wCBOqQ3V3rc2payp+bTbA/Jj0b8/wCdZfjr9oLVPEULWukbdFsCSNsA/etnHU9v/r15tp9vf+JNXjtbeJri6uP3Y3Hccnua86Mpcysfm1PEYfB4iEcC3Opfc+1/Hnizw5o3gm1+Ld/pzzPotqbhWUZkSNhhlH5CuH/Zx/4KAeA/2mvH0nhPw1Yala6gts9zuu0wu1etd14q+EOpeMP2er7wNb3SWt7e2H2YyycgE9a+D/B/wHv/APgl3rR+LfibUIfFGnTqdJFnZLtkDS8g59tte7Ft2bP6SwkpyoQlU3aP1Yj/AE61+Uf/AAWu/wCQ18P/APdl/kK7Rv8AgtR4UjJ2+B9QP1mFfIH7d/7ZekftbXXhq403RbrSG0sSLJHcMGDZ6EY/GrO0+y/+CL2F+FnjMn/oIIP/AB2n/t1f8E8viD+0t8am8XeHNS0yCw+xx24ju5MMCpP+NfKv7DH7emifsn+Etb0fUvDt3rUmo3Czq1vIBtwuMc1+sH7LX7SFh+0/8NT4v07TJtKt/tLweRM4Zty9elAI/Ar49fBXW/2efiPe+DNfnt7jU7VFeRrU5T5v/wBVfo7+zr/wVJ+F3wn+CPhDwlqenazcajpNiltK0UQKZHHBrqf2uf8AgmR4j/aO+N+reNdO8UWOmW11FHGIZoizZUHPT6144v8AwRV8XxsN3jnTCrHnELA4qjRH6t+BPGFn8QPB+k+IrBZEs9St1uYlk+8FYZGaseLNNm1jwzqthb7RPdWssCFjgbmQqM/nWP8ACXwbN8Pfht4c8NXEy3M2l2Uds8y9HZRgmt/XtUTRNHvb+RTItrBJOUU4LBFLED8qClufkh8P/wDgkz8VvCvxK8P6/NqmimxsdRhu2RJfn2LIGIHvgGv16EfHQfjX57eD/wDgr54U8YeM9J0GHwdqUUmo3UdqkrzLgF2Azj8a/QfzcdTg9cHFMsdJXzr+2X+yDZftd+GfD+k3viO48Oro91JdLJBAJfMLptwQSOmP1rM/b6/aU1r9mP4X6R4j0SLzrm51AWxTeijBQnncjfpivMP+Cfv7bXij9qLxt4n0nXrfyItNso7qP50bO47T91F9uuetSY31Pz9/bi/Yqs/2Q7zw7FaeJZvEK6qjszTW4i2bSRwAT6V9pf8ABGDj4UeMh1/4mYP/AI4BXB/8FrP+Qh8POMfuZ/5mu7/4Iwj/AItT4yb+L+08Dkf3B/hTLO7/AGzv+CjGofso/FC28I2vgu219JrJLw3NxeGE/MSMYAPpX5K/tIfGmT9ob4vaz46n01NJm1Ipus45N6rgY4av2l/aY/YP8K/tMePoPEutTpFcw2iW65WTJUMT/C6/rnr2r8cP2vPhLpvwO+PniTwbpTb7LT3VUY7u6hu5PrTA+uf2eP8AglHo/wAbPhB4c8ay+PL7TZtUgEz2qWiOsZ44B71+p3gXwmPhf8N9K0NZ/tw0exEXmkbfM2KTnpxnFfi/8Hf+Cl3jn4Q/D/R/B+nW5fT9NiESOzxZPOM8x5/Wv2V+EfiS5+I3wk8Pa1qGVuNU09ZZRx/EpHYCgD8/NQ/4LBa5pfxGn8NH4d2LwxX/ANiFwL19+3fs3YxX6GeNPDp+K3wt1TRZJjp6a5phiMsY3mPzI+eD1xmvjvxl/wAEwPAdteax4t+1f8TON5NQRdsv3wS4/wCWmO3oa8K+Ev8AwU28da58W/Dfgia1H9nzarHpxk3x/wCrDbOnl57f3qAIvjX/AMEj9F+FPwt8R+LIfiDfX0mk2jXAtpLBFWQjtuB4r805V+YkDue9f05fE3wLbfFDwDrfhm9bFpqUDQOeeh+hH86/L79r7/gnH4N+AvwG17xlpl2HvbFodq7JckNIqkcykd/SkB8h/sb/ALNtt+1F8Vv+EQu9Yl0OL7M0/wBpiiEhyO2Ca/WL9kL/AIJ46d+yb8QLzxNZ+MLrX3urRrVoJ7VYQvOd2QTX5A/s6ftAal+zf8QW8U6NEZLnyWg2ggcH6jFfVH/D3z4iNyLNwO3zW/8A8ZNMfU/ZpPU96WT6496+Hf8Agnp+2b4m/am8ReMbDXoWhTSLW3niJMZyXaQH7ka/3R1zTP8AgoR+2p4o/ZZ8T+F9P0K382LUreSZ2+TqpAx8yN69sUAx37a3/BRLUf2T/ihYeFLPwfa68lzpyX5uLi5aMrud124Hpt/WvIND/ZXX/gpNaH40aj4muvA0+oZsm0ixT7RGvl/xBiR13V8A/tPftG6z+0144s/E2txeVd29mtoB8nQEn+FF9e+a/Xj/AIJTsf8AhknRx63k4/lVGcrnvH7OfwVT9n74U6R4Ji1aTWo9PUgXk0YRnz6jJr0yT/VSeu04/I1+Yv7XX/BR7xx8Efjt4g8HaPb7rOwZV5eL9Mxk9vWvvH9nf4iXnxW+A/hTxbfqUvNW01bp1OP4gfT6UhH5q/sF/GbUfCv7anjbwRNqAi8Pa5fXTm3nOV85HYqV98k19+fFX9n1/iJ4ohuopo7GCOMeZJGMtI3b8Rj9a/DLx7rl/wCG/wBpLXNT0u6ezv4NfkaOeM8qfOPNf0GeMPFtx4R+D2p+IYtz3NlpJul5GSwQEdawqw9ouVnnYzL8PmEOStG6PCG/YvMlwZG8RTKC2SPswJx6cmvQvBfw/wDAXwp1mxtpdRs/7bumEUKzzjzGYeiA8da/MDxf/wAFXviXr2kanpcCzWX2iJokuoZI0kjPQEFYs/rXmP7FXi7W/GX7YPgK913VbvVrs3zEzXcpdslTnr+FZRpqJ5uE4dy7BT9pRp2Z+xX7X/7RV1+zD8H5/Glpo8WtyxXcVsLSaUxqd+ecgZGMV8OaP+0Nd/8ABU66/wCFQavo0PgK1h/4mx1Sxma6kJi4CBWUdd1foJ+0R8CtL/aG+HMnhHV3CWclzHcEsCeVzjp9a8l/Zv8A2C/Cf7OHxE/4SrQ5g12bWS2YKsvIYj+9Iw/Sug+itY+dR/wRN8PSLj/hZupgL2/s+POfzHrXyR+3R+xXY/sh3nhuCx8S3HiJNWWQu9xbrEY9v0JznP6V+9pXG49K/Kb/AILWNjUvh+MdUm5oEeFfsSfsDad+1t4S1vWb3xXdeHzp9wsKxW9qJd2QTznp0r3nWf2kLr/glxeD4PaPpUHjy1Yf2kdSvpTbSAyfwYX0xXyf+y/+254m/Zf8P6npWhwGaK/lEshDIuCARn50cfpX2Z8Kv2f9L/4KPeGD8UvGk4ttX81rARkP91MY5jZB39KQI+1/2U/j1c/tGfBnTfG91pUejTXcskf2SGTzFULjnP418cfHL/grRrnwl+L3iXwbB8PtPv4dFvWtBcyXzq8mO+Pxr7f/AGffgnp/7P8A8M7XwdpcomsrWWSSNhu/ixx8xJ7etfg9+2vIU/au+J2P+g1L/IVoaI/fz4d+PJPHXwv0XxVJaLaTahYLem3VyVUlc7Q34V+a/wAS/wDgr9q1pqniXwyPh7ZvHG8+nm4N45OOU3Y9ea8b8B/8FSPH/hnwpovhSCzX7DaQx2Syb4/uYC9PKz/49X0vff8ABM3wV4o8E3Xj64vD9uvtPfVpI9sv3yjSH/lrjrjtQWj8xvga/mfG7wQ3/UYtf/Ri1/S6v3V+gr+af4LxRw/HbwYkRyi63bgfhKK/pZX7o+lA2eQ/tLfsz+F/2ovCFl4c8V3N9bWVrc/akNjKEYtjHOQc18N/HjwVZf8ABKvSdN8VfCWWTUNR8TzHT71dexKixRgOpTGOcsc/hX0T/wAFKvj94w/Z5+D+k674MvlsNRuNQFu8jIH+XHofrX5AfHT9rr4k/tGaTp2m+ONXj1K10+ZpoESEIVZhgnj2ArFGVtbn3V8DbJf+CqqahdfFh/7Pfwy/l2X9hfugVcZJbOcnNfcX7M/7K/hX9l3QdQ0nwrc31zbXs5nka+kDNuA2+g96/Cr4GftUfEL9naO/j8D6pHpwv2DT+ZEJNxAwOvtn869Z/wCHov7QXX/hKrbP/Xop/rWqGfvLIp4OOQMe9fI/xs/4Jo/DH48fErV/GniDUNZh1PUWUyJaThUGFA4yDVr/AIJt/Hjxh+0J8E9Q1/xpfR6hqcOpPAkscQT5AOBivrJgFU0FHwUf+CN/wXH/ADFfEn/gSv8A8TX2b4W8M2vw18B2Ohac7SW2lWYgt2mOSQi4G73r8n/2uP8AgoJ8Z/hX+0N4x8MeH/EEFrpGn3PlQwtbgkLjPUn3r9R/gzrl34++DfhnVdYkFxealpqSXDL8u4sPmPXvTA/LjxZ/wVS+K1x481PwkdM0U6a+ovprO0J8wIX8vIII5wfevefEX/BOn4a/CXwbdfFvSr3WH8S6Lbf2/FFPOrQNOoEm0rtztyfWvWvGX/BPH4J2sWs+Jv7BmXVo1lvxP5zECVQWBx06gV+evgn9ub4t/E34nab8Nde12G58I6tqH9jXFqLdVZrdn8vbu69MUAabf8Fj/jQpyul+HAp6A2rEj/x6us+Ff7YHjX/goB430/4LfEC302y8La6S11LpUJjnHljzFwST3UV9kj/gl3+z3JyfC1yf927cf0ry/wDaS/Zh+Hv7GPwl1X4qfC/SJtI8YaSUFpdzTtIF3naeDjsTSA0j/wAEcfgy7c6p4hGP7tyP6g07/hzj8GF6ar4k/wDAlf8A4mvgn/h6L+0D1/4Si3wf+nQf419Z/wDBN79sz4o/tCfGfUdA8aaxHqOnQ6e06RpCEwwPXrz2pjR9X/sw/sU+CP2UtW1y/wDCV5qVzLrEMUFwL+UPgRszLtwBj7xz+FfC3/Ba4Z+IHw8Of+YfcAj/AIGK+jv+Cnn7THjr9m3wz4Fu/A+oR6fdard3Mdw8kQfcEWMqMH/eNeQfse6BZf8ABRrRNe1v43qfEV94cnjtLB7Y/Z/LjcF2HHvigdjzD/gn7+wL4A/ai+EGp+KPFV3qkF7b6q9ki2cmxNiojf8As1bXxi/af8U/8E7fG0/wh+G9pp954asYxdRTawhln3SdRuyOPlo/a3+K3iH/AIJ5/Eay+H3wXu18P+Gr6wTVZ7edBOzTOzITlvZBXsn7MP7PXgr9uL4WWvxQ+LWnya54xupntpr2GQxBo0+6No44yaomx+WHxs+MOsfHX4kap4z12G2t9U1Bw8iWikR+3GTX0h8Mf+CoPxS+FPw90PwfpNho0mm6RaraQtNBligzjP515V+218MtC+EP7R3ibwt4btTZ6RYsgiiJzjIz1xX6Mfsw/wDBPn4L/Er9nfwR4q1nQLibVtT0pLq4mW5IBcg84A9qBWPyN8R+KLjxN4vvtfu0X7XeXbXkqR/Ku9m3ED0Ffb/hL/gpl8Ufi5qWlfDvV9P0NNF10ppd1Jb25SQRP8pKEEY/HNfG/j/w/YaN8Vta0ayjKWFvqslrHGGJYxiQrjP0FfsP4m/YB+DXw1+G95420PQri38Q6Rpv9oWl0bh8LMqhgSvfmkx2PMvjP/wSv+E/gP4Q+JfFVjquuS6hp9g91Gss4ZN23OMADjJ75r8yPhT8TdW+CfxA0jxjoawPqmmTmSFbhcruGRyK+qfhr+3R8XfjT490X4eeK9bhvvC2uXY0+/tktljdoCSCN457Cv0DP/BLX4BNwfDtwSP+nk1lYDxD9h7/AIKKfEb9pD46W3g3xJp+i22nS2ctx5llC6yBlxjufWvo/wDb1/aL8Sfsw/BeHxZ4Wt7K41B9RhtCl9GWTYwOTwR6Vq/B79hv4UfAfxnH4o8JaLJaawkTQpM8xbCtjI/SvGP+Cwmf+GWrYn/oN2/8mphY+Qm/4LJfGc5/4lHhv0/49n/+Kr1z4G2Kf8FWI9QvPizu0x/DBEdl/YJ8oEP13Bs55Hb3r8sPWvX/AIG/tUfET9nWHUovA2qJp66gQZw8QfO3p16dT+dArHqf/BQj9lbwt+yr460DSvC11fXdpqFq80hvpVZgwK9MAY4as79nr/goX8Rv2Z/AA8IeFrHR5tNFzJc7723LuWYjPII9K8o+OX7R3jj9ofVbHUPG+oJqN1ZI0cLLEE2qcZ6deg/KvMvM3c0E2PvA/wDBYz41PjOm+HMZwR9kbn/x6vp7wL/wT7+HP7WfhHS/i74vvdZt/E3i6EapfRWNwqQLI3BCLt4Hy1+OPcV/RX+xS239lH4Zf9ghD/481Uho8Aj/AOCPPwYtpopU1PxCWRw/z3S44/4DX2DrWhweGfhXqGk2pY2tlo8tvGZCS2FhYDJ79K/If4wf8FHvjh4P+M3iPQdP8Q2selWepvBHC1qGIjEmMZJr9ZrfV7nX/gb/AGleMHurrQGmlccAs0BJ4/GmWj+eb4I/8l18G/8AYbt//Rwr+ltfur9BX80nwR/5Lr4N/wCw3b/+jhX9La/dX6CkM5H4nfCHwj8ZNGg0jxjoltrunwzCdLe5BKhx3615mP2CvgH/ANE00f8AGM/4145/wVo+IHiX4d/A3QL3wxrt9oN5Lq6xvPYzNE5XYeMg1+Ttp+0b8atSkdbLx54qumXG4QXcrkZ6ZwfasEZn7jf8ME/AP/ommj/9+z/jSN+wV8A+3w20dT6hD/jX4in46fHwcHxZ41/7+T0f8L0+Pn/Q1+Nv++560A/oK+Gfwl8JfB3RJdH8HaJbaFpskpme3tQQpcgAmutNfzkf8L0+Pv8A0Nfjb/v5PQPjl8fT/wAzX42/7+T1RR+5vjL9jT4OfEDxJea94g8C6bqmrXj757mZMsx9a9OstBsvBvhEabpMItLLT7VktoV6RqqnaB9K/nQuP2mfjDa3Gy4+IPiaKWM8xyXsikfUE1++/wACdVuta/Z48NXt9dyXt5PoqSSzTHLsxjySTmmB+KfxW/bb+Ntr468U6RF4/wBUTTo724tltxJ8vl72G36Yry/9nG4e8/aI8BTSHdJJrlu7N6kyAk1zfxc/5Kj4s/7Clx/6Maud0vVrvRb+C+sbiS1vLdxJFNEcMjDoQaYH9IX7TXiDUvCP7PvjXVtHu5LDUrTTZJILmIgNGwxyK/BDx1+1p8W/iZ4cudB8TeN9S1bSLjHm2txICjY6Zr0L9mz46fEL4gfHXwZ4f8TeMtZ1zQdS1COC706+vGkgmQ9VdCcEe1ftLd/sy/BbToTLd/D7wtbRDq81lEqj8TSA/m8LV1/wz+Lni74O63Lq/g3W7jQtSliMDXFsQGKHqORX9Bln+zv8C9Rl8u18EeDrqTukNtA5/IV8Yf8ABWL4M+A/h18C9FvvDHhDR9DvZdUWN7ixtVifbgcZAoGjj/8Agnfq1z+2r4j8Z2Hxrlbx/a6Fa20+nRapgrbtIzq5XHchF/75FfpL8M/gj4J+C9jfW3gvw/a6DFdlWnW2XHmFQQpP0yfzr+cjwN8S/Fnw1nuZ/CniHUfD090oWZ9PnaJpAM4DEHkcn86/Wv8A4JFfEvxZ8SvBfj2fxV4iv/EElvfQLCdQnaXylKNkLnpnA/IUyj5g/wCCyn/JzGhc/wDMuwf+jZa+Yvh5+1V8U/hT4cj0Hwt4x1DR9KjdnW2t3woJ6n9K/oA8e/DL4Y+MNWju/GeieH9S1JIxHHLqqxtJ5eeAN1cyfgL8Af8AoVPBf/fq3piPBv2SfgD4A/aW+A/h7x/8SfDdp4q8XamrG71O8BMsmMYya+DP2jP2nvih8C/jd408AeB/F194e8I6DfyWGn6XasBHBAOAn6mv288G6HoHhvQIbDwza2Nlo8ZPkw6cFEK+uNvFfz4ftzcftcfFL/sNTf0pjPGtT1691jWLjVLydpr6eYzyzE8s55LfWvY9R/bc+NmraLNpN34+1O406aFreSB3yrIRyDXjGkKG1WyDKjqZ4wVkAKn5hwR6V/Q5ovwJ+An9jae8nhXwZua3jYl4oMn5RzSEfz26F4o1Lw1rttrGm3clnqNtJ5sM8Z+ZGznNfa/7Gv7Y3xi8fftI+CtA1/x1qOoaXe3XlzW8xUqw2k8/lX6lw/AP4C3Uixw+EPBksjdFSGAk/lXR6D+zz8MvDGqW+qaN4I0PTdQgO6K6tbNEdT7MBUgeNf8ABSL4l+J/hP8As03uveEtZn0XVlv4IlurcgNtbdkfpX4u/En9p74ofF7QRovi/wAYahrmliVZhbXT5XeOhr9fv+Csq7f2R9Qx/wBBK2/9mr8+/wDglZ4B8O/ET9o2703xLo1nrlgNJnkFvexCRNwxg4pjPjPd+P4V+jn/AASl/Z9+H/xo0nxpceM/Dttrk1m8SwG4BOwEHOPrx+VdL/wVx+Efgv4b+DfBk/hjwtpegz3F1Ikz2Fuse8bRjOPTnH1Nbv8AwRT/AOQH4+x18yHr680AfX0n7AfwEmbdJ8ONJc9MshNRt+wH8Ao8Y+G+kjnshHavj/8A4KvfET4keEPiZ4Ut/But69ptm9mzSx6SZAmcrgtt+p6+9fQ//BMPxP4q8Wfs6SX/AIwv9T1HVf7SmjE2pkl9oAwAT9f5UiD8sf8Agob8PPD/AMLP2ntd8PeGNNi0rSYIIXjtoQQFLKSa/Zj9igbv2UPhl3/4lCcdvvNX5E/8FT/+TxfE3/Xtb/8AoJr9df2KSf8AhlD4Z/8AYIT+bUxdR+sfsUfBPxBr11rWo+ANLu9SupjPLcSplmfOc/mK9J8UabbaP8NtYsbOFbe1t9LniiiXoiiJgAPyr8J/jp+0p8UtH/aC8XWNn4/1+2srfWpY47eO+dY1QSfdxnGMV+0+leMtM1L4GRebrtpdX02g4ffdKZXkaDoeckkmgpH8/nwR/wCS6+Dv+w5b/wDo0V/S2v3V+gr+bf4K+GdYj+N3g6ZtJvhF/bVs29rZgu0yg5zj0r+klfuj6UDPgL/gsx/yQDw3/wBhpf8A0A187f8ABGXT7XUPit4/S6tobmP+yoflmjDD/WN6ivon/gsx/wAm/wDhv/sNL/6Aa+f/APgiz/yVj4hf9giD/wBGtUGZ+pviTxF4F8GzRR6/eaNo7zAtEL3y4t4GM4zjOMj8xWB/wuD4OKxz4r8J597qD/Gvz1/4LW/8hDwD/wBcJv8A0MV+XDD5jQB/Sj/wuL4NjB/4SzwkP+3uD/Guw0I+F/E2lxaloiaXqVjJ/q7m0SN0bHoRxX8vuORX7/8A/BNT/kzHwL/uS/8Ao00DPyI/b2gig/ay8eJEixp9u+6owK/bz9nJd37NHg9FBZn0SNVUDJJMQwMV+In7fX/J3Hj/AP6/zX7hfsxyLD+zx4GeQ7UXSYCT7CMVYz8Gfix8EviA/wAR/FtyPBWum3/tC4l80WEmzb5jfNnbjFeU2ej3uoahHYW1rLPfSP5a26IS5b+7tHev6CvHv7ZvwXtdD8Saa/xC0qPUIbeeB7dZDvEmwjb9cmvxL+BNxHdftV+Dpo3WSOTxPE6uvRgZ8g/rQB137MPwn8Z+Dfj54I1jXvC+raNpVnqcctzfX1nJFDCg6szkYA571+m3/BRv4y+ENZ/ZX8TWmgeMtJu9TdofLi06/jklOJBuxsbI4zXuv7Y3/Js3xB/7BU3/AKCa/nEPD0gPu/8A4JLa5fXn7UaQXF9PNE2m3B2ySFhwjY6mvq7/AILKcfs96B/2F1/9BFfIf/BIrDftURE/9Ay4/wDQDX17/wAFlP8Ak3vQP+wsv/oIpjR+QXhbwN4i8bS3EXh/RL/WpIFDSrY27zFAQcE7RxnB/I1+tn/BHvwP4h8E+B/H8XiHRL/RZJ7+ExLfW7xFwEOcbhz1H5ivnH/gkz8bvBHwV8TfEK58a+IbTw/Bf2lrHbvdEgSFZH3YwO25fzr9Jv8Ahuf4C4/5Kbov/fxvT6UFH5uf8FjdYvrH9pDQYre7mt4/+EficrFIVyTNL1x9K+Dk8QaruBGpXme2J2z/ADr9B/8AgoF4C1/9sD4yab4t+D2k3Hjvw3aaTHp9xqOmKDFFcLJIzRsTj5sOp/Gvg3x98OfEfwt8QyaH4p0m40XVo1Dva3Iw4B6HFUB+03/BP34zeDdF/Zb8JWOu+MNIs9TVXEkd5fKsnJON24j0r80/2uvhT4z8eftJ/EHxD4b8M6xr2h6jqsk9pqNjZvLDPGQMMjqCGB9a+Y1b5hzjJr9wP2R/2wPg34K/Zr+HGh618QNK0zVrHSILa4tZnIaKUDlDj0yKAPx7b9n/AOJcKsz+BPECIBks+nygY/75rlZvEGtxSskmpXyyKcFWncEfhmv6b/7StvEfhuS706UX1rfWrPbyRnKyqyHBH1r+fjxj+xr8atLl1jWLv4fasunxSSTy3RQFFTcTuPtigDI/ZX8Qas37RPgANqV4wOqxDDTse/ua/oj1LXLDw3pTX+qX0VhZRjMlxdOFVfqa/nD/AGdtcsPCfx48F6rq92mn2FhqcctxNNwqAHnNfrT+2d+118HvHn7M/jbQtD8d6VqOqXdmEgtIHJd23DgUAH/BSDxpoHxe/ZrvfD/gnWbLxXrjX8Eo07SJ1uJyi7tzBFOcDIr5c/4JP/C/xh4L/aWubvXvC+r6PaNo86i4vLR4k3ZGBlgOua87/wCCT3H7W2n85/4l1x/7LX7nt0oA/NH/AILV/wDIi+BB/wBPsn/oNcV/wR5+IXhnwPpfjoeIdfsNFM8kPlC+nWLfgc7cnnGRn6iuy/4LWHPgvwIP+nuX/wBBr8ldu7I/rQB/SbefGz4T6hKr3PjLwxcsowplvYWI9cZPFS2vx0+FVjEUg8beGbeLrtjvoQv86/nw+Gn7OvxF+MlheX3gvwpfeIbS0kEU8tqowjEZAOSOuD+Vdn/wwj8eh/zTPWf++E/+KoFY6z/gpZ4g0vxZ+1l4i1HRtQt9VsJLe3CXNpKssbYU9GBxX6ofsf8Axo8A6D+y/wDDmx1Hxlodne2+kqk1vPfxpIjbmyCpOa/C3x18P/EXwv8AEUug+KNLn0fV4VDyWtwBvUHOD1r0Hw3+x78Y/GWi6fq+j+ANW1HTb6Pzre5hiyjp60CsbHx9+EPjrxH8bPG2r6T4T1rUNOutUuLiG9tbGVopIy2Q6sFxjBHNeaeCdY1XR/HGj293qF3ZrDqNuJ45pmVVAkGQwNf0R/A/w/qGg/APwnpN9bSWupWuixwSW7j50cJytfiL8WP2NfjRJ428WawngDVX05r24uvtCx5URly24+2KAW5+1ul/E74RzRW8MPiLwzJLKERIhPCzsSoAAHXNepfe6PtH1r+aj4Hxtb/GrwWjAKy6xbAr3BEqgg1/Syo+UfQUFHwH/wAFlv8Ak37w3/2Gl/8AQDXgH/BFn/krHxC/7BMH/o1q9/8A+Cy/H7P/AIc/7DI/9ANeAf8ABFfn4sfEEn/oEQf+jWrld7syOk/4LWf8hDwB/wBcZv8A0Kvy5Nfsr/wVI/Zp+Inx8vvB0ngfQJNaSwjlE5jYDYSen8/yr4Ib/gm7+0If+ZDuP+/gppgfMFfv7/wTV/5Mz8C/7sv/AKMNflB/w7c/aD/6EO5/77FfsJ+wz8N/EHwl/Zi8KeGPE9g2m61ZiQT27dVzISP0NKT7DPxk/b8/5O68ff8AX/X7e/s4W73X7NfgyJBl5NGiQDOMkxAV+IX7fn/J3Xj7/r/r9w/2ZbhbX9nXwRM/EcekQu30EYyaq+xR+Q3xH/4JvfHvX/H3iHUrLwik9ndX880Mn2lBlC5IrX+Bf/BO346+DfjH4N13VPCK2+nadqkF1PL9pQ7UVgTX6W3X/BQX4FWPiCTRZPG9uNRjm+ztCIm4kBxtz0619EW91HdQxzRMHikUOjDupGQasR4/+2Jn/hmf4g/9guX/ANBr+fD4YfC7xB8Y/G1p4W8MWn23Wbzd5MGcbsKSf5V/Qf8Atjf8mz/EH/sFTf8AoJr8SP2D/iV4d+Ev7S3h7xN4p1BdN0a0EvmztnjKEdqAPpb9kn4M+Kv2Fvih/wALF+L9j/wjvhNbaSzN5uL4kkBVRj6kVu/8FLP2vfhd8ffg5pOi+C/EH9p6jb6gJ5IvKK/LgD/Gt/8A4KSftefCb43fAE6D4N8Uwavq/wBtil+zxqQdqsCTz9K/OX4R/BPxh8dfEc2ieCtIfV9RijMzQoQCE9aoaNT4Jfs4eO/2iL7VbTwPpP8Aak+lxJLdAyBAisSF/wDQT+Veu/8ADsP9oAH/AJFOI/8AbyOf0r7d/wCCWv7LvxG/Z+8R/EG48daC+jw6nY20NqWcMJGV5Cw/JhX1z8Yv2pfhr+z/AKlp+n+OvEUejXd/E00COhO9VIDHj3IplHj3/BM/4EeMv2fvgnrOg+NdNGl6lcay93HEsivujMUY3cHjlSPwr5a/4KA/sRfF742ftEal4n8JeHV1HSJraKNJvOC8jOetfYn/AA8o/Z7/AOh7g/79NSj/AIKT/s+FgB47g/79NTEflSP+CY/7QYBz4OUcZ/4+VNfOvjTwRqnw68Yaj4b163+x6vptwbe5h67WHUV/St8OfiT4e+LXhG08S+Fr9dS0e6B8m4QYBxX4+ftVfsH/ABr8fftGePvEugeDp73RtS1WW4tZw4wyHoaYz9bfgX/yRvwV/wBgm2/9FirPxi0G/wDFHws8UaTpkfm395YSQwx5xuYjgV88fDv9ur4KeAvBvh/wvrXjGGx1zTbWKxurRo2LRzIAjL+BzX1FrHibTtB8OT67fziDTbeD7TJKRwqYBz+tAH4K+NP+Ce/xw8H6LrHiHV/Cv2fTLJHuZpvOBwgPXArwjwD8P9a+J3i/T/DXh61+26vfP5cMOcZNfs5+0F+318C/G3wT8ZaFpPjeG51K/wBOkhghWNsuxHAr8pv2QfHWi/Df9orwf4k8Q3n2HSLG5Mk87A/KuDQK59tf8E9/2K/i38Ef2ibHxH4u8O/2do8dlNC0/mhsMcYGPwr9H/jN8cPCfwE8Kx+IvGV+2naU862/nBN3zN0GK8e/4eQfs9/9D9b/APftq8C/bR+K/hb9uD4Sx+Afgzqa+MfFcV7Hftp8AKt5KZ3Nz6ZFAzw3/gpx+1V8Of2iPC/hW18EaydTn0+4d51eIptUgYx68mvzyY5zXqfxf/Zk+JHwDs7G58c+HJtEgvXaOB5GVg7AZPT8Kj+EH7NHxE+PEeoTeCNAl1mOwIFw0RA8skZFAH6Zf8EXv+SUeMf+whH/AOgNX6N+tfEn/BL/AOAvjj4DfD/xNp3jfRZNGuru8jlgRnDbkCkE+3Jr7bboe1JiZ+C//BUxv+MxPE3/AF7W/wDI19z/ALMH/BQH4J/D34A+B/D2ueKTZ6rp2nrBcQeQx2sCT1H1rwf9v39iv4v/ABi/aW17xN4T8JT6po9xDCiXCOAGKrz1+tfOo/4Ju/tCKR/xQVyP+2i0xn72+GPElh4u8P2Gs6XN9o0+9iE0EuMblPeq3j9v+KF8Rf8AYOuP/RTVhfAnw7feE/g74O0fU7drXUbHTYYLiFuqOF5H510XjPT5tT8I61aW6GW4nspoo0B+8zRsAP1qRaH83nwY/wCS6+EP+w3b/wDo0V/Swv3R9K/DP4X/APBP3486L8WfDer3/gieCwtdVhuZp964CCQMW/Kv3M8vIBx271Qz4D/4LNH/AIx98Ojv/bA/9ANfDP8AwTu/au8Jfsp+NPFmreLLTUbuDVLGK3g/s+JXKurEnOWHZv51+qn7c37Leq/tX/DfSvDWlazbaLNa3oujNcozA8Y7fj+dfDf/AA5P8Yuxx8QdF29sW0nTFYMxWjPoRP8Agsj8Eox/yCvFBz/05x5/H95T/wDh8t8E/wDoFeKf/AKP/wCOV87/APDkzxj/ANFC0f8A8BZaX/hyX4x/6KFo3/gLLU6Bc+hv+Hy3wT/6BXin/wAAo/8A45TZP+CyXwTdf+QV4p/Cyi/+O189/wDDkvxj/wBFC0b/AMBZaP8AhyX4x/6KFo3/AICy0aDPi79qD4oaT8Zvjv4m8YaHHcQ6Zql150Md0NsgHuO1fvb+zfbtdfs3+C4E4aTRokDE4AJiGM+1fnGv/BE3xijA/wDCwtG9x9llr9R/hN4Kn+Hfw38PeGrmeO5m0y0jtmmiBCuVAGRntQM/KvWv+CTfxivvilc+Io9R8MLYvqpvVUXcgfy/M3dPLxnHvX6r694ig+GPw7u9Z1VHktNE04z3At13EiOPnaO/TvXV46Vyfxc8GzfEL4ZeJfDNvPHazatYS2azSglULqRk4+tWUfn58ev+Cqnwj+KHwd8XeFNM07xHFqGq2L2sLT2iBNxx1IfIFfkg7Bs/XrX6SL/wRR8bSFs+PtFAVsD9xKOPXoaX/hyX40P/ADUDRB/2wlP9KYj4q/Z1/Z38R/tMePf+ES8Lz2VvqXkPcb752SPaoJPIU+lfdHwS+Dus/wDBMHxJP8R/itPbX+h6hCdOih8PuZp/MPQkNt+Xn3r2b9jP/gnD4l/ZX+LX/CX6j4q07WrdrSS3+z2sTq2SpwfmHrivbv24f2XdU/aq+G9l4Z0rWrXRZ4LsXJmukZlYDGRxVDND9l/9tTwN+1dqWuWfhGz1S1l0iGKWY6lAsYZXZlG3DHOCp6+teKf8FFP2JfHf7VnijwtqHhG80m2h0q1lhmGoytGSWIIxhTnpXR/sEfsO65+yNrniq81fxFY66uswQwxCyjZRHsZ2Oc9c7h+Rr7LApjPxTP8AwRv+NfT+1fDB5/hu5P8A43Xyn8fPgbrv7O/xCufB3iO4s7jVLdFkdrJmdMN05IHpX9LJr87/ANsL/gmd4k/aU+Nd/wCNNN8XabpFvcQRxfZ7qJmYFc/3frTA81/ZC/4KWfC34D/AbQPBmv6fr8+q6cGVms7ZGjbJz1LjH5V+lPwy+I2m/F74c6J4v0eOaLTdZs1u7ZbgbXCNnGf/AK1flm3/AARR8bdB8QtDyembaWv06/Z/+Gdx8H/g34Q8GXt3FfXWiafHZvcQqVRyo6gHnFAH5f8AjX/gkx8XvEHxK1jXrbUvDaWN1qcl3Gj3Mu/Y0m/keXjP41+pnj/wbf8Aib4S6v4ZtGhXUbvS2s0aQny9+3HJ9PwrtzxSZNK4rn4bfEr/AIJV/F34e+E9c8V6lqPht9N02F7uZYbqQy7Qc8Dy8frXxXImGr+mr4yeBZviZ8L/ABJ4Wt547aXVbN7YSyglV3dzivy5H/BFPxjIz48f6Ptzx/o8vA9OlURK9z82dtfS37Af7Rnhj9mH40XHivxVBfz6fJp0toBp8Su+5iDyCw44r6RP/BE3xmfu+P8ARh9baU/0pP8AhyZ41/6KBov/AIDSUE6nB/8ABQ79tvwJ+1RoPhmz8JWmrW9xp07STHUIVjXBGBtwxz1NVf8Agnd+2l4G/ZVsfFEPi601a6fUmjMJ02FZFwvXOWGD0r0Y/wDBEvxqf+agaL/4DSUn/Dkvxr/0UHRf/AaWjQq59Ef8PlPgkucaT4q6/wDPlH/8co/4fKfBRgSNL8Tgj+/ZoM/k5r53/wCHJfjX/ooOi/8AgNLSf8OTfGoI/wCLg6L/AOA0tLQZ+nfwI+N2h/tCfDuz8ZeHYLyDS7p2RFvowkmVxnIBPrXoVeM/si/Au/8A2c/gjpPgjUtRh1S6spZGNzbqVRgxGMA817NUMRFc3C20LSN0UE8ewzXxD4i/4K8/BnwzruoaVc6Z4me5s53t5Wjs4yu5WKnBMnIyK+2tQtnvLWaJH2NJGyAkZAJHBr8pfGX/AARr8YeKvF2s6vH470eGO+u5LhY3gkLLuYnB496Qz6F8Kf8ABXD4O+MvEmmaJY6V4mF3fXEdvG0lnEEDOwUZPme9fbXnKvBIB9DX5U/Dv/gjz4x8C+OtB15/HWjzxafexXLxpBIGYIwbA49q/VRYVZQSMnHpTuVoTUUUVmQFFFFABSgZpKVaADbRtp1FADSMUlK1JVIYUUUUwCk2j0paKABVHpTj0pFpW6UCEWlxSLTqAE2ikIp1I1ADaKKKAFWlyKbRQA6lpq06gAooooAKKKKACmt1p1NbrQAlFFFABRRRQAUUi/dH0pakAooopAFOWm0q0AOooooAa1JStSVSAKKKKYBRRRQAq06mrTqACiiigAooooAatDdaFobrQAlFFFACrTqatOoAKKKKACiiigAprdadTW60AJRRRQAUUUUAf//Z');
function changeQrCode() {
    showQrCode.value = true;
}

function changeQrPosition(e) {
    qrPosition.value = e.target.value;
    window.localStorage.setItem('qrPosition', e.target.value);
}

function uploadQr(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (!e || !e.target) {
                alert('收款码上传失败！');
                return;
            }
            const imgSrc = e.target.result; // Base64编码的字符串
            qrCodeUrl.value = imgSrc;
            window.localStorage.setItem('qrCode', imgSrc);
            console.log(imgSrc); // 输出Base64编码的字符串到控制台
        };
        reader.readAsDataURL(file); // 读取文件内容为DataURL（Base64编码）
    }
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
                <div v-if="qrPosition === 'up'" class="aside">
                    <img @load="codeLoaded = true" :src="qrCodeUrl">
                </div>
                <div class="wrapper">
                    <div v-if="qrPosition === 'left'" class="aside">
                        <img @load="codeLoaded = true" :src="qrCodeUrl">
                    </div>
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
                    <div v-if="qrPosition === 'right'" class="aside">
                        <img @load="codeLoaded = true" :src="qrCodeUrl">
                    </div>
                </div>
                <div v-if="qrPosition === 'down'" class="aside">
                    <img @load="codeLoaded = true" :src="qrCodeUrl">
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
            <button class="button" v-if="showPreview" @click="changeQrCode">自定义收款码</button>
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
        <div v-if="showQrCode" class="modal goods transparent">
            <div @click="showQrCode = false" class="modal-mask"></div>
            <div class="modal-wrapper" id="image-downloader">
                <div>上传自定义收款码，上传后将会持久保存</div>
                <div style="height: 12rem;box-sizing: border-box;" class="image-wrapper">
                    当前:
                    <div :style="`width: 100%;height: 10rem;
                    background: url('${qrCodeUrl}');
                    background-size: contain;
                    background-repeat: no-repeat;
                    background-position: 50% 50%;
                    `"></div>
                </div>
                <div>
                    <label for="profile_pic">选择要上传的收款码图片</label>
                    <input
                            @change="uploadQr"
                            type="file"
                            id="profile_pic"
                            name="profile_pic"
                            accept="image/*" />
                </div>
                <div>
                    收款码位置
                    <select @change="changeQrPosition" name="pets" id="pet-select">
                        <option :selected="qrPosition === 'right'" value="right">右</option>
                        <option :selected="qrPosition === 'left'" value="left">左</option>
                        <option :selected="qrPosition === 'up'" value="up">上</option>
                        <option :selected="qrPosition === 'down'" value="down">下</option>
                    </select>
                </div>
                <div class="btn-bar">
                    <button class="button" @click="showQrCode = false">返回</button>
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

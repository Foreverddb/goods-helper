<script setup lang="ts">
import {computed, inject, provide, ref, watch} from "vue";
import {iconArray} from "@/assets/icons"
import {TableValue} from "@/typings.ts";
import AddModal from "@/components/add-modal.vue";

const props = withDefaults(
    defineProps<{
        bandTheme: string
    }>(),
    {
        bandTheme: "popipa"
    }
)

const toggleImportModal = inject("toggleImportModal")

const showPreview = defineModel('preview')
const theme = defineModel('theme')
const tableValue = defineModel<TableValue[]>('table', {
    default: () => []
})

watch(theme, (value) => {
    window.localStorage.setItem('theme', value + '');
});


// modal
const showAdd = ref(false);
const editingAdd = defineModel<TableValue | null>("edit", {
    default: () => null
})

const logoUrl = computed(() => new URL(`../assets/${props.bandTheme}/${props.bandTheme}.png`, import.meta.url).href)


// 操作列表
const actions = [
    "add",
    "preview",
    "import",
    "clear",
    "theme"
]

const menu = ref<HTMLElement>()
const isOpened = ref(false)

const openMenu = () => {
    const childrenElement = menu.value?.children

    for (let i = 0; i < childrenElement.length; i++) {
        const item = childrenElement[i] as HTMLElement

        item.style.transform = `translateY(-${i * 60}px)`
        item.style.opacity = 0.8

    }

}

const closeMenu = () => {
    const childrenElement = menu.value?.children

    for (let i = 0; i < childrenElement.length; i++) {
        const item = childrenElement[i] as HTMLElement
        item.style.transform = `translateY(0)`
        item.style.opacity = 0
    }

}

const toggleMenu = () => {
    isOpened.value = !isOpened.value;
    isOpened.value ? openMenu() : closeMenu();
}

// 操作菜单
const actionIndexFunc = (action: string) => {
    // console.log(action);
    if (action === "add") {
        toggleAddModal()
    } else if (action === "preview") {
        preview();
        toggleMenu();
    } else if (action === "import") {
        toggleImportModal()
        toggleMenu();
    } else if (action === "clear") {
        if (confirm('这将清除所有表格信息并且无法恢复，确定继续吗？')) {
            tableValue.value = [];
        }
        toggleMenu();
    } else if (action === "theme") {
        switchTheme()
    }
}

// 预览
function preview() {
    const wrap = document.getElementById('wrap');
    if (wrap) {
        wrap.scrollLeft = 0;
    }
    showPreview.value = !showPreview.value;
}

// 切换主题
let themeIdx = 0
const themeList = [
    'popipa',
    'roselia',
    'ras',
    'hhw',
    'monica',
    'mygo',
]

function switchTheme() {
    const curIdx = (++themeIdx) % themeList.length
    theme.value = themeList[curIdx]
}

// 新增 goods
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

provide("confirmAdd", confirmAdd)

</script>

<template>
    <div class="menu-container">
        <div class="logo-content">
            <img @click="toggleMenu" :src="logoUrl" class="logo" alt="logo">
        </div>
        <div class="action-content" ref="menu">
            <div class="action-container" v-for="(action, index) in actions" @click="actionIndexFunc(action)"
                 :id="action">
                <img v-if="!showPreview" :src="iconArray[index]" :alt="action" style="height: 30px"/>
            </div>
        </div>
    </div>

    <add-modal
            v-model:show="showAdd"
            v-model:edit="editingAdd"
    ></add-modal>
</template>

<style scoped lang="less">
.menu-container {
    display: flex;
    align-items: center;
    justify-content: center;

    background: transparent !important;

    border-radius: 50%;

    position: fixed;
    bottom: 1em;
    right: 1em;

    z-index: 100;

    .logo {
        width: 70px;
        height: 70px;
        z-index: 100;

    }


}

.action-content {
    position: relative;

    .action-container {
        display: flex;
        justify-content: center;
        align-items: center;

        transition: all 0.3s ease-in-out;

        position: absolute;
        bottom: 40px;
        right: 10px;

        width: 50px;
        height: 50px;

        border-radius: 50%;

        opacity: 0;

        z-index: 5;
    }
}
</style>
<script setup lang="ts">
import {computed, ref} from "vue";
import {iconArray} from "@/assets/icons"

const props = withDefaults(
    defineProps<{
      bandTheme: string
    }>(),
    {
      bandTheme: "popipa"
    }
)

const showPreview = defineModel('preview')
const theme = defineModel('theme')

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
    console.log(`translateY(-${i * 60}px)`)

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

const toggleMenu = (event: Event) => {
  const target = event.target as HTMLElement
  console.log(target.id !== "theme" && (target as HTMLImageElement).alt !== "theme", target, (target as HTMLImageElement).alt)
  if (target.id !== "theme" && (target as HTMLImageElement).alt !== "theme") {
    isOpened.value = !isOpened.value
    isOpened.value ? openMenu() : closeMenu();
  }
}

// 操作菜单
const actionIndexFunc = (action: string) => {
  console.log(action);
  if (action === "add") {

  } else if (action === "preview") {
    preview()
  } else if (action === "import") {

  } else if (action === "clear") {

  } else if (action === "theme") {
    switchTheme()
  }
}

function preview() {
  const wrap = document.getElementById('wrap');
  if (wrap) {
    wrap.scrollLeft = 0;
  }
  showPreview.value = !showPreview.value;
}

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

</script>

<template>
  <div class="menu-container" @click="toggleMenu">
    <div class="logo-content">
      <img :src="logoUrl" class="logo" alt="logo">
    </div>
    <div class="action-content" ref="menu">
      <div class="action-container" v-for="(action, index) in actions" @click="actionIndexFunc(action)" :id="action">
        <img v-if="!showPreview" :src="iconArray[index]" :alt="action" style="height: 30px"/>
      </div>
    </div>
  </div>
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
<script setup lang="ts">
import {ref} from "vue";
import {iconArray} from "@/assets/icons"

const props = withDefaults(
    defineProps<{
      bandTheme: string
    }>(),
    {
      bandTheme: "popipa"
    }
)

const logoUrl = new URL(`../assets/${props.bandTheme}/${props.bandTheme}.png`, import.meta.url).href


// 操作列表
const actions = [
    "add",
    "preview",
    "import",
    "clear"
]

const menu = ref<HTMLElement>()
const isOpened = ref(false)

const openMenu = () => {
  const childrenElement = menu.value?.children

  for (let i = 0; i < childrenElement.length; i++) {
    const item = childrenElement[i] as HTMLElement

    item.style.transform = `translateY(-${(i + 1) * 60}px)`
    item.style.opacity = 1
    console.log(`translateY(-${(i + 1) * 60}px)`)

  }

}

const closeMenu = () => {
  const childrenElement = menu.value?.children

  for (let i = 0; i < childrenElement.length; i++) {
    const item = childrenElement[i] as HTMLElement
    item.style.transform = `translateY(0)`
    console.log(`translateY(${(i + 1) * 60}px)`)
    item.style.opacity = 0
  }

}

const toggleMenu = () => {
  isOpened.value = !isOpened.value
  isOpened.value ? openMenu() : closeMenu();
}

const actionIndexFunc = (action: string) => {
  if (action === "add") {

  } else if (action === "preview") {

  } else if (action === "import") {

  } else if (action === "clear") {

  }
}

</script>

<template>
  <div class="menu-container" @click="toggleMenu">
    <div class="logo-content">
      <img :src="logoUrl" class="logo" alt="logo">
    </div>
    <div class="action-content" ref="menu">
      <div class="action-container" v-for="(action, index) in actions">
        <img :src="iconArray[index]" :alt="action" style="height: 30px"/>
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
    bottom: -25px;
    right: 10px;

    width: 50px;
    height: 50px;

    border-radius: 50%;

    opacity: 0;

    z-index: 5;
  }
}
</style>
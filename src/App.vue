<!-- src/App.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastContainer from './components/ui/ToastContainer.vue';
import ConfirmDialog from './components/ui/ConfirmDialog.vue';
</script>

<template>
  <RouterView v-slot="{ Component }">
    <transition name="pagina" mode="out-in">
      <component :is="Component" />
    </transition>
  </RouterView>

  <ToastContainer />
  <ConfirmDialog />
</template>

<style>
.pagina-enter-active,
.pagina-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.pagina-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.pagina-leave-to {
  opacity: 0;
}
</style>
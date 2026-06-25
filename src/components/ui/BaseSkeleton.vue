<!-- src/components/ui/BaseSkeleton.vue -->
<script setup lang="ts">
defineProps<{
  alto?: string;
  ancho?: string;
}>();
</script>

<template>
  <div
    class="skeleton"
    :style="{ height: alto || '20px', width: ancho || '100%' }"
  ></div>
</template>
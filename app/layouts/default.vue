<template>
  <div
    class="flex h-dvh flex-col overflow-hidden bg-[#1c1c1e] text-neutral-100"
  >
    <AppHeader />
    <div class="min-h-0 flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>

<template>
  <div class="flex flex-col items-center gap-3">
    <canvas
      ref="canvas"
      class="size-16"
      width="64"
      height="64"
      role="img"
      :aria-label="LABEL"
    />
    <p class="text-sm text-neutral-500" aria-hidden="true">{{ LABEL }}</p>
  </div>
</template>

<script setup lang="ts">
import { drawSolving, SOLVING_SIZE, SOLVING_SPEED } from "~/utils/solvingOrb";
interface Props {
  label?: string | "Building...";
}
const props = defineProps<Props>();
const LABEL = props.label;
const canvas = ref<HTMLCanvasElement | null>(null);

let stop = () => {};

onMounted(() => {
  const el = canvas.value;
  if (!el) return;
  const size = SOLVING_SIZE;
  const dpr = Math.min(
    2,
    (typeof devicePixelRatio !== "undefined" && devicePixelRatio) || 1,
  );
  el.width = Math.round(size * dpr);
  el.height = Math.round(size * dpr);
  const ctx = el.getContext("2d");
  if (!ctx) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  let running = false;
  let visible = true;
  let reduced = motion.matches;

  const frame = (tSec: number) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    drawSolving(ctx, size, tSec, true);
  };
  const loop = () => {
    frame((performance.now() / 1000) * SOLVING_SPEED);
    if (running) raf = requestAnimationFrame(loop);
  };
  const halt = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const start = () => {
    if (running || reduced) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const sync = () => {
    if (reduced) {
      halt();
      frame(0.6);
      return;
    }
    frame((performance.now() / 1000) * SOLVING_SPEED);
    if (visible && document.visibilityState !== "hidden") start();
    else halt();
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    sync();
  });
  io.observe(el);
  const onVis = () => sync();
  const onMotion = () => {
    reduced = motion.matches;
    sync();
  };
  document.addEventListener("visibilitychange", onVis);
  motion.addEventListener("change", onMotion);
  sync();

  stop = () => {
    halt();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    motion.removeEventListener("change", onMotion);
  };
});

onBeforeUnmount(() => stop());
</script>

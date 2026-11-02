<script setup lang="ts">
const baseUrl = import.meta.env.BASE_URL;

withDefaults(
  defineProps<{
    sceneId: string;
    categoryId: string;
    categoryIcon: string;
    title: string;
    label?: string;
    variant?: number;
    presentation?: "asset" | "category" | "goal";
  }>(),
  {
    label: "",
    variant: 0,
    presentation: "asset",
  },
);
</script>

<template>
  <div
    class="scene-artwork"
    :class="`scene-artwork--${presentation}`"
    :data-category="categoryId"
    :data-variation="variant % 6"
    role="img"
    :aria-label="`Иллюстрация: ${title}`"
  >
    <svg
      class="scene-artwork-background"
      viewBox="0 0 720 440"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <use :href="`${baseUrl}images/category-scenes.svg#${sceneId}`" />
    </svg>
    <span class="scene-artwork-wash" aria-hidden="true"></span>
    <span v-if="label" class="scene-artwork-label">{{ label }}</span>
    <svg class="scene-artwork-icon" aria-hidden="true">
      <use :href="`${baseUrl}images/category-icons.svg#${categoryIcon}`" />
    </svg>
    <span class="scene-artwork-title">{{ title }}</span>
  </div>
</template>

<style>
.scene-artwork {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  isolation: isolate;
  background: #17212a;
}

.scene-artwork-background {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  transform-origin: center;
  transition:
    transform 0.55s cubic-bezier(0.2, 0.75, 0.25, 1),
    filter 0.35s ease;
}

.scene-artwork-wash {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(10, 15, 23, 0.04) 20%, rgba(10, 15, 23, 0.74)),
    radial-gradient(
      ellipse at 82% 14%,
      rgba(245, 220, 166, 0.17),
      transparent 46%
    );
  pointer-events: none;
}

.scene-artwork-label {
  position: absolute;
  top: 11px;
  left: 12px;
  max-width: calc(100% - 58px);
  overflow: hidden;
  padding: 5px 7px;
  border: 1px solid rgba(241, 228, 206, 0.28);
  border-radius: 4px;
  background: rgba(10, 14, 20, 0.64);
  color: #f0e2c9;
  font: 700 9px/1.2 var(--font-display);
  letter-spacing: 0.7px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-artwork-icon {
  position: absolute;
  right: 12px;
  bottom: 11px;
  width: 30px;
  height: 30px;
  padding: 6px;
  border: 1px solid rgba(241, 228, 206, 0.26);
  border-radius: 50%;
  background: rgba(10, 14, 20, 0.55);
  color: #f0d7a1;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6px;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
}

.scene-artwork-title {
  position: absolute;
  right: 51px;
  bottom: 13px;
  left: 12px;
  overflow: hidden;
  color: #f7f1e4;
  font: 600 12px/1.35 var(--font-display);
  text-overflow: ellipsis;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.75);
  white-space: nowrap;
}

.scene-artwork[data-variation="1"] .scene-artwork-background {
  transform: scale(1.52) translate(-7%, 2%);
  filter: sepia(0.18) saturate(1.12);
}

.scene-artwork[data-variation="2"] .scene-artwork-background {
  transform: scale(1.72) translate(7%, -7%);
  filter: hue-rotate(24deg) saturate(1.2);
}

.scene-artwork[data-variation="3"] .scene-artwork-background {
  transform: scale(1.58) translate(6%, 8%);
  filter: hue-rotate(-28deg) contrast(1.08) saturate(1.15);
}

.scene-artwork[data-variation="4"] .scene-artwork-background {
  transform: scale(1.76) translate(-10%, -8%);
  filter: sepia(0.27) saturate(1.3);
}

.scene-artwork[data-variation="5"] .scene-artwork-background {
  transform: scale(1.55) translate(10%, 7%);
  filter: hue-rotate(38deg) brightness(0.94) saturate(1.28);
}

.asset-card:hover .scene-artwork-background,
.category-card:hover .scene-artwork-background {
  transform: scale(1.82);
}

.scene-artwork--category .scene-artwork-label,
.scene-artwork--category .scene-artwork-icon,
.scene-artwork--category .scene-artwork-title {
  display: none;
}

.scene-artwork--goal .scene-artwork-label {
  top: auto;
  bottom: 45px;
  left: 12px;
  color: #f1e4ce;
  font-size: 8px;
  letter-spacing: 1px;
}

.scene-artwork--goal .scene-artwork-title {
  right: 12px;
  bottom: 14px;
  font: 700 10px var(--font-display);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.asset-art .scene-artwork {
  position: absolute;
  inset: 0;
}

.scene-artwork--asset .scene-artwork-title {
  right: 48px;
  bottom: 35px;
  left: 12px;
  font-size: 13px;
}

.goal-art {
  border-radius: 8px;
}
</style>

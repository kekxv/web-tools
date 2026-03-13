<template>
  <div 
    class="mahjong-tile" 
    :class="[
      `size-${size}`, 
      `color-${tile?.color || 'ji'}`,
      { 
        'is-back': isBack, 
        'is-selected': selected, 
        'is-drawn': isDrawn, 
        'is-sideways': sideways 
      }
    ]"
  >
    <template v-if="!isBack && tile">
      <div class="tile-face">
        <template v-if="tile.color !== 'ji'">
          <span class="tile-num">{{ getDisplayNumber(tile) }}</span>
          <span v-if="tile.color === 'man'" class="tile-suit">萬</span>
          <span v-else-if="tile.color === 'pin'" class="tile-suit">筒</span>
          <span v-else-if="tile.color === 'sou'" class="tile-suit">索</span>
        </template>
        <span v-else class="tile-suit-ji">{{ tile.display }}</span>
      </div>
    </template>
    <div v-else class="tile-back-pattern"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  tile: { type: Object, default: null },
  size: { type: String, default: 'normal' }, // normal, small, mini
  isBack: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  isDrawn: { type: Boolean, default: false },
  sideways: { type: Boolean, default: false } // 用于侧边家横向排列
})

const getDisplayNumber = (tile) => {
  if (tile.color === 'ji') return ''
  return tile.index
}
</script>

<style scoped>
.mahjong-tile {
  --tile-w: 42px;
  --tile-h: 58px;
  --tile-bg: #ffffff;
  --tile-thick: 4px;
  --thick-color: #cbd5e1;
  --thick-shadow: #94a3b8;
  
  width: var(--tile-w);
  height: var(--tile-h);
  background: var(--tile-bg);
  border-radius: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 1px 0 var(--thick-color),
    0 2px 0 var(--thick-color),
    0 var(--tile-thick) 0 var(--thick-shadow),
    0 6px 10px rgba(0,0,0,0.3);
  transition: all 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  user-select: none;
  flex-shrink: 0;
  cursor: pointer;
  z-index: 1;
}

/* 横向排列 */
.is-sideways {
  transform: rotate(-90deg);
  margin: -8px 0;
}

.tile-face {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 尺寸适配 */
.size-small {
  --tile-w: 32px;
  --tile-h: 44px;
  --tile-thick: 3px;
}

.size-mini {
  --tile-w: 22px;
  --tile-h: 30px;
  --tile-thick: 2px;
}

/* 状态样式 */
.is-selected {
  transform: translateY(-15px);
  box-shadow: 0 15px 25px rgba(0,0,0,0.4), 0 4px 0 #3b82f6;
  z-index: 10;
}

.is-drawn {
  margin-left: 12px;
  border: 2px solid #fbbf24;
}

.is-back {
  background: linear-gradient(135deg, #2563eb, #1e40af);
}

.tile-back-pattern {
  width: 70%;
  height: 80%;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 2px;
}

/* 牌面排版 */
.tile-num {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 1.3rem;
  font-weight: 900;
  line-height: 1;
}

.size-small .tile-num { font-size: 1rem; top: 1px; left: 3px; }
.size-mini .tile-num { font-size: 0.8rem; top: 1px; left: 2px; }

.tile-suit {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1;
}

.size-small .tile-suit { font-size: 0.7rem; bottom: 1px; right: 3px; }
.size-mini .tile-suit { font-size: 0.6rem; bottom: 1px; right: 2px; }

.tile-suit-ji {
  font-size: 1.6rem;
  font-weight: 900;
}
.size-small .tile-suit-ji { font-size: 1.2rem; }
.size-mini .tile-suit-ji { font-size: 0.9rem; }

/* 花色配色 */
.color-man { color: #e11d48; }
.color-pin { color: #2563eb; }
.color-sou { color: #16a34a; }
.color-ji { color: #1e293b; }

@media (max-width: 600px) {
  .mahjong-tile:not(.size-mini):not(.size-small) {
    --tile-w: 26px;
    --tile-h: 36px;
  }
  .size-small {
    --tile-w: 22px;
    --tile-h: 30px;
  }
  .tile-num { font-size: 1.1rem; top: 1px; left: 3px; }
  .tile-suit { font-size: 0.7rem; bottom: 1px; right: 3px; }
}

@media (max-width: 380px) {
  .mahjong-tile:not(.size-mini):not(.size-small) {
    --tile-w: 24px;
    --tile-h: 34px;
  }
  .tile-num { font-size: 1.1rem; top: 1px; left: 2px; }
  .tile-suit { font-size: 0.65rem; bottom: 1px; right: 2px; }
  .tile-suit-ji { font-size: 1.2rem; }
}
</style>

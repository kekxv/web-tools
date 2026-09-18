<template>
  <div class="passcode-keypad" :class="{ 'is-disabled': disabled }">
    <button
      v-for="key in DIGIT_KEYS"
      :key="key.digit"
      type="button"
      class="key"
      :disabled="disabled"
      @click="emit('press', key.digit)"
    >
      <span class="key-digit">{{ key.digit }}</span>
      <span v-if="key.letters" class="key-letters">{{ key.letters }}</span>
    </button>

    <button
      type="button"
      class="key key-action"
      :disabled="disabled || !leftLabel"
      @click="emit('left')"
    >
      {{ leftLabel }}
    </button>

    <button type="button" class="key" :disabled="disabled" @click="emit('press', '0')">
      <span class="key-digit">0</span>
    </button>

    <button
      type="button"
      class="key key-action key-delete"
      :class="{ 'is-hidden': !showDelete }"
      :disabled="disabled || !showDelete"
      @click="emit('delete')"
    >
      ⌫
    </button>
  </div>
</template>

<script setup lang="ts">
/** iOS 风格的数字密码键盘 */
withDefaults(
  defineProps<{
    /** 停用状态（例如手机被锁定） */
    disabled?: boolean
    /** 是否显示删除键（iOS 在未输入时不显示） */
    showDelete?: boolean
    /** 左下角功能键文案，为空则不可点 */
    leftLabel?: string
  }>(),
  {
    disabled: false,
    showDelete: false,
    leftLabel: ''
  }
)

const emit = defineEmits<{
  (e: 'press', digit: string): void
  (e: 'delete'): void
  (e: 'left'): void
}>()

const DIGIT_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' }
]
</script>

<style scoped>
.passcode-keypad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  justify-items: center;
  gap: clamp(6px, calc(var(--hunit, 1vh) * 1.2), 10px);
  width: 100%;
  max-width: 250px;
  margin: 0 auto;
}

/* iOS 锁屏键盘：扁平半透明圆钮，不用描边和渐变 */
.key {
  position: relative;
  width: clamp(44px, min(calc(var(--hunit, 1vh) * 8.4), 19vw), 68px);
  aspect-ratio: 1 / 1;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  transition: background 0.16s ease, transform 0.1s ease;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
}

.key:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.26);
}

.key:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.46);
  transform: scale(0.95);
}

.key:disabled {
  cursor: not-allowed;
}

.key-digit {
  font-size: clamp(19px, calc(var(--hunit, 1vh) * 3.9), 31px);
  font-weight: 400;
  line-height: 1;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.key-letters {
  margin-top: clamp(1px, 0.4vh, 3px);
  font-size: clamp(7px, calc(var(--hunit, 1vh) * 1.2), 10px);
  font-weight: 500;
  letter-spacing: 1.6px;
  opacity: 0.9;
}

/* 左下功能键 / 删除键：纯文字，不占视觉重量 */
.key-action {
  background: transparent;
  font-size: clamp(12px, calc(var(--hunit, 1vh) * 2), 16px);
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.key-action:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.key-action:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.24);
  transform: scale(0.95);
}

.key-delete {
  font-size: clamp(17px, calc(var(--hunit, 1vh) * 2.8), 22px);
}

.key-delete.is-hidden {
  visibility: hidden;
}

.is-disabled .key {
  opacity: 0.3;
}

.is-disabled .key:active {
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .key {
    transition: none;
  }
}
</style>

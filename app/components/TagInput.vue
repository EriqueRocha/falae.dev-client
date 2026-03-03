<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  placeholder?: string
  maxTags?: number
  maxTagLength?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [tags: string[]]
}>()

const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const maxTagsLimit = computed(() => props.maxTags ?? 10)
const maxTagLengthLimit = computed(() => props.maxTagLength ?? 50)

const addTag = () => {
  let tag = inputValue.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')

  if (!tag) return

  tag = tag.slice(0, maxTagLengthLimit.value)

  if (props.modelValue.includes(tag)) {
    inputValue.value = ''
    return
  }
  if (props.modelValue.length >= maxTagsLimit.value) return

  emit('update:modelValue', [...props.modelValue, tag])
  inputValue.value = ''
}

const onInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let value = input.value.toLowerCase().replace(/[^a-z0-9]/g, '')
  value = value.slice(0, maxTagLengthLimit.value)
  input.value = value
  inputValue.value = value
}

const removeTag = (tagToRemove: string) => {
  emit('update:modelValue', props.modelValue.filter(tag => tag !== tagToRemove))
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  } else if (e.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
    removeTag(props.modelValue[props.modelValue.length - 1])
  }
}

const focusInput = () => {
  inputRef.value?.focus()
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 cursor-text min-h-[42px]"
    @click="focusInput"
  >
    <span
      v-for="tag in modelValue"
      :key="tag"
      class="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm"
    >
      #{{ tag }}
      <button
        type="button"
        @click.stop="removeTag(tag)"
        class="hover:text-blue-200 transition-colors"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>

    <input
      v-if="modelValue.length < maxTagsLimit"
      ref="inputRef"
      :value="inputValue"
      type="text"
      :placeholder="modelValue.length === 0 ? (placeholder || 'Adicionar tag...') : ''"
      class="flex-1 min-w-[100px] bg-transparent text-slate-300 placeholder-slate-500 text-sm focus:outline-none"
      @input="onInput"
      @keydown="handleKeydown"
      @blur="addTag"
    />
  </div>
  <p class="text-xs text-slate-500 mt-1">
    {{ modelValue.length }}/{{ maxTagsLimit }} tags (máx. {{ maxTagLengthLimit }} caracteres cada)
  </p>
</template>

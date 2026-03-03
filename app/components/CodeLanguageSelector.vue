<script setup lang="ts">
const props = defineProps<{
  currentLanguage: string
  isVisible: boolean
}>()

const emit = defineEmits<{
  'select': [language: string]
  'close': []
}>()

const searchQuery = ref('')
const selectedIndex = ref(0)

const languages = [
  { id: 'plaintext', name: 'Texto Puro' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'c', name: 'C' },
  { id: 'cpp', name: 'C++' },
  { id: 'csharp', name: 'C#' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'php', name: 'PHP' },
  { id: 'swift', name: 'Swift' },
  { id: 'kotlin', name: 'Kotlin' },
  { id: 'scala', name: 'Scala' },
  { id: 'r', name: 'R' },
  { id: 'perl', name: 'Perl' },
  { id: 'lua', name: 'Lua' },
  { id: 'bash', name: 'Bash / Shell' },
  { id: 'powershell', name: 'PowerShell' },
  { id: 'sql', name: 'SQL' },
  { id: 'graphql', name: 'GraphQL' },
  { id: 'html', name: 'HTML' },
  { id: 'xml', name: 'XML' },
  { id: 'css', name: 'CSS' },
  { id: 'scss', name: 'SCSS' },
  { id: 'less', name: 'Less' },
  { id: 'json', name: 'JSON' },
  { id: 'yaml', name: 'YAML' },
  { id: 'toml', name: 'TOML' },
  { id: 'ini', name: 'INI' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'latex', name: 'LaTeX' },
  { id: 'dockerfile', name: 'Dockerfile' },
  { id: 'makefile', name: 'Makefile' },
  { id: 'nginx', name: 'Nginx' },
  { id: 'apache', name: 'Apache' },
  { id: 'diff', name: 'Diff' },
  { id: 'wasm', name: 'WebAssembly' },
  { id: 'objectivec', name: 'Objective-C' },
  { id: 'dart', name: 'Dart' },
  { id: 'elixir', name: 'Elixir' },
  { id: 'erlang', name: 'Erlang' },
  { id: 'haskell', name: 'Haskell' },
  { id: 'clojure', name: 'Clojure' },
  { id: 'fsharp', name: 'F#' },
  { id: 'ocaml', name: 'OCaml' },
  { id: 'matlab', name: 'MATLAB' },
  { id: 'julia', name: 'Julia' },
  { id: 'vim', name: 'Vim Script' },
  { id: 'arduino', name: 'Arduino' },
]

const filteredLanguages = computed(() => {
  if (!searchQuery.value.trim()) {
    return languages
  }
  const query = searchQuery.value.toLowerCase()
  return languages.filter(lang =>
    lang.name.toLowerCase().includes(query) ||
    lang.id.toLowerCase().includes(query)
  )
})

const selectLanguage = (langId: string) => {
  emit('select', langId)
  searchQuery.value = ''
  selectedIndex.value = 0
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredLanguages.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selected = filteredLanguages.value[selectedIndex.value]
    if (selected) {
      selectLanguage(selected.id)
    }
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

watch(searchQuery, () => {
  selectedIndex.value = 0
})

const searchInputRef = ref<HTMLInputElement | null>(null)
watch(() => props.isVisible, (visible) => {
  if (visible) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    searchQuery.value = ''
    selectedIndex.value = 0
  }
})
</script>

<template>
  <div v-if="isVisible" class="language-selector">
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="text"
        placeholder="Buscar linguagem..."
        class="search-input"
        @keydown="handleKeydown"
      />

      <div class="language-list">
        <button
          v-for="(lang, index) in filteredLanguages"
          :key="lang.id"
          type="button"
          class="language-item"
          :class="{
            active: lang.id === currentLanguage,
            highlighted: index === selectedIndex
          }"
          @click="selectLanguage(lang.id)"
          @mouseenter="selectedIndex = index"
        >
          <span class="lang-name">{{ lang.name }}</span>
          <span class="lang-id">{{ lang.id }}</span>
        </button>

        <div v-if="filteredLanguages.length === 0" class="no-results">
          Nenhuma linguagem encontrada
        </div>
      </div>
  </div>
</template>

<style scoped>
.language-selector {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background-color: rgb(30 41 59);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  z-index: 100;
  min-width: 220px;
  max-width: 280px;
}

.search-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: rgb(51 65 85);
  border: none;
  border-bottom: 1px solid rgb(71 85 105);
  border-radius: 0.5rem 0.5rem 0 0;
  color: white;
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: rgb(100 116 139);
}

.search-input:focus {
  background-color: rgb(71 85 105);
}

.language-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 0.25rem;
}

.language-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: rgb(203 213 225);
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.1s;
}

.language-item:hover,
.language-item.highlighted {
  background-color: rgb(51 65 85);
}

.language-item.active {
  background-color: rgb(59 130 246);
  color: white;
}

.language-item.active .lang-id {
  color: rgb(191 219 254);
}

.lang-name {
  font-weight: 500;
}

.lang-id {
  font-size: 0.75rem;
  color: rgb(100 116 139);
  font-family: ui-monospace, monospace;
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

/* Scrollbar styling */
.language-list::-webkit-scrollbar {
  width: 6px;
}

.language-list::-webkit-scrollbar-track {
  background: transparent;
}

.language-list::-webkit-scrollbar-thumb {
  background-color: rgb(71 85 105);
  border-radius: 3px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background-color: rgb(100 116 139);
}
</style>

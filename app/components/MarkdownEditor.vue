<script setup lang="ts">
import { markdownToHtml } from '~/utils/markdownToHtml'
import { useMermaidLazy } from '~/composables/useMermaidLazy'

const { renderMermaidDiagrams } = useMermaidLazy()

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLElement | null>(null)
const showPreview = ref(false)
const errorMessage = ref('')

const showLinkModal = ref(false)
const showYoutubeModal = ref(false)
const showTableModal = ref(false)
const showLatexModal = ref(false)
const showMermaidModal = ref(false)
const showHeadingMenu = ref(false)

const linkText = ref('')
const linkUrl = ref('')
const youtubeUrl = ref('')
const latexCode = ref('')
const tableRows = ref(3)
const tableCols = ref(3)

const content = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})

const autoResize = () => {
  const textarea = textareaRef.value
  if (!textarea) return

  const scrollTop = window.scrollY

  textarea.style.height = 'auto'

  const newHeight = Math.min(Math.max(textarea.scrollHeight, 150), 500)
  textarea.style.height = `${newHeight}px`

  window.scrollTo(0, scrollTop)
}

watch(content, () => {
  nextTick(autoResize)
})

watch(showPreview, async (isPreview) => {
  if (isPreview) {
    await nextTick()
    renderMermaidDiagrams(previewRef.value)
  }
})

const renderedPreview = computed(() => {
  if (!content.value) return ''
  return markdownToHtml(content.value)
})

const insertText = (before: string, after: string = '', placeholder: string = '') => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)
  const textToInsert = selectedText || placeholder

  const newText =
    content.value.substring(0, start) +
    before + textToInsert + after +
    content.value.substring(end)

  content.value = newText

  nextTick(() => {
    textarea.focus()
    if (selectedText) {
      textarea.selectionStart = start + before.length
      textarea.selectionEnd = start + before.length + selectedText.length
    } else {
      const cursorPos = start + before.length + placeholder.length
      textarea.selectionStart = cursorPos
      textarea.selectionEnd = cursorPos
    }
  })
}

const insertLine = (text: string) => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const beforeCursor = content.value.substring(0, start)
  const afterCursor = content.value.substring(start)

  const needsNewLine = beforeCursor.length > 0 && !beforeCursor.endsWith('\n')
  const prefix = needsNewLine ? '\n' : ''

  content.value = beforeCursor + prefix + text + '\n' + afterCursor

  nextTick(() => {
    textarea.focus()
    const newPos = start + prefix.length + text.length + 1
    textarea.selectionStart = newPos
    textarea.selectionEnd = newPos
  })
}

const toggleBold = () => insertText('**', '**', 'texto')
const toggleItalic = () => insertText('*', '*', 'texto')
const toggleStrikethrough = () => insertText('~~', '~~', 'texto')
const toggleInlineCode = () => insertText('`', '`', 'código')
const insertCodeBlock = () => insertLine('```\n\n```')
const insertBlockquote = () => insertLine('> citação')
const insertHorizontalRule = () => insertLine('---')
const insertBulletList = () => insertLine('- item')
const insertNumberedList = () => insertLine('1. item')

const insertHeading = (level: number) => {
  const textarea = textareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selectedText = content.value.substring(start, end)
  const prefix = '#'.repeat(level) + ' '

  if (selectedText) {
    const newText =
      content.value.substring(0, start) +
      prefix + selectedText +
      content.value.substring(end)

    content.value = newText

    nextTick(() => {
      textarea.focus()
      textarea.selectionStart = start + prefix.length
      textarea.selectionEnd = start + prefix.length + selectedText.length
    })
  } else {
    const beforeCursor = content.value.substring(0, start)
    const afterCursor = content.value.substring(start)

    const needsNewLine = beforeCursor.length > 0 && !beforeCursor.endsWith('\n')
    const linePrefix = needsNewLine ? '\n' : ''

    content.value = beforeCursor + linePrefix + prefix + afterCursor

    nextTick(() => {
      textarea.focus()
      const newPos = start + linePrefix.length + prefix.length
      textarea.selectionStart = newPos
      textarea.selectionEnd = newPos
    })
  }

  showHeadingMenu.value = false
}

const openLinkModal = () => {
  const textarea = textareaRef.value
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    linkText.value = content.value.substring(start, end) || ''
  }
  linkUrl.value = ''
  showLinkModal.value = true
}

const insertLink = () => {
  if (!linkUrl.value) return
  const text = linkText.value || linkUrl.value
  insertText(`[${text}](${linkUrl.value})`, '', '')
  showLinkModal.value = false
  linkText.value = ''
  linkUrl.value = ''
}

const openYoutubeModal = () => {
  youtubeUrl.value = ''
  showYoutubeModal.value = true
}

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

const insertYoutube = () => {
  const videoId = extractYoutubeId(youtubeUrl.value)
  if (!videoId) {
    errorMessage.value = 'URL do YouTube inválida'
    setTimeout(() => { errorMessage.value = '' }, 3000)
    return
  }
  const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
  insertText(`[![YouTube](${thumbnail})](${videoUrl})`, '', '')
  showYoutubeModal.value = false
  youtubeUrl.value = ''
}

const openTableModal = () => {
  tableRows.value = 3
  tableCols.value = 3
  showTableModal.value = true
}

const insertTable = () => {
  const rows = Math.max(1, tableRows.value)
  const cols = Math.max(1, tableCols.value)

  let table = '| ' + Array(cols).fill('Coluna').map((c, i) => `${c} ${i + 1}`).join(' | ') + ' |\n'
  table += '| ' + Array(cols).fill('---').join(' | ') + ' |\n'

  for (let r = 0; r < rows; r++) {
    table += '| ' + Array(cols).fill('célula').join(' | ') + ' |\n'
  }

  insertLine(table)
  showTableModal.value = false
}

const openLatexModal = () => {
  latexCode.value = ''
  showLatexModal.value = true
}

const insertLatex = (inline: boolean = true) => {
  if (!latexCode.value) return
  if (inline) {
    insertText(`$${latexCode.value}$`, '', '')
  } else {
    insertText(`$$\n${latexCode.value}\n$$`, '', '')
  }
  showLatexModal.value = false
  latexCode.value = ''
}

const openMermaidModal = () => {
  showMermaidModal.value = true
}

const handleMermaidSubmit = (code: string) => {
  insertLine('```mermaid\n' + code + '\n```')
  showMermaidModal.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'b':
        e.preventDefault()
        toggleBold()
        break
      case 'i':
        e.preventDefault()
        toggleItalic()
        break
      case 'k':
        e.preventDefault()
        openLinkModal()
        break
      case 'e':
        e.preventDefault()
        toggleInlineCode()
        break
    }
  }
}

const handlePaste = (e: ClipboardEvent) => {
  const text = e.clipboardData?.getData('text/plain')?.trim()
  if (!text) return

  //detecta YouTube
  const youtubeId = extractYoutubeId(text)
  if (youtubeId) {
    e.preventDefault()
    const thumbnail = `https://img.youtube.com/vi/${youtubeId}/0.jpg`
    const videoUrl = `https://www.youtube.com/watch?v=${youtubeId}`
    insertText(`[![YouTube](${thumbnail})](${videoUrl})`, '', '')
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.heading-dropdown')) {
    showHeadingMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  nextTick(autoResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="markdown-editor">

    <div class="editor-tabs flex items-center justify-between w-full px-2 sm:px-4 py-2 bg-zinc-900">
      <div class="flex items-center gap-1 sm:gap-2">
        <button
            type="button"
            class="tab-btn flex items-center gap-1 text-white/70 hover:text-white transition text-sm sm:text-base"
            :class="{ 'text-white font-semibold': !showPreview }"
            @click="showPreview = false"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
          <span class="hidden xs:inline">Escrever</span>
        </button>

        <button
            type="button"
            class="tab-btn flex items-center gap-1 text-white/70 hover:text-white transition text-sm sm:text-base"
            :class="{ 'text-white font-semibold': showPreview }"
            @click="showPreview = true"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span class="hidden xs:inline">Visualizar</span>
        </button>
      </div>

      <div class="flex items-center gap-1 sm:gap-2 text-white">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 471 289.85"
            class="w-5 h-5 sm:w-7 sm:h-7 fill-current"
        >
          <path d="M437,289.85H34a34,34,0,0,1-34-34V34A34,34,0,0,1,34,0H437a34,34,0,0,1,34,34V255.88A34,34,0,0,1,437,289.85ZM34,22.64A11.34,11.34,0,0,0,22.64,34V255.88A11.34,11.34,0,0,0,34,267.2H437a11.34,11.34,0,0,0,11.33-11.32V34A11.34,11.34,0,0,0,437,22.64Z"/>
          <path d="M67.93,221.91v-154h45.29l45.29,56.61L203.8,67.93h45.29v154H203.8V133.6l-45.29,56.61L113.22,133.6v88.31Zm283.06,0-67.94-74.72h45.29V67.93h45.29v79.26h45.29Z"/>
        </svg>

        <span class="hidden sm:block text-lg font-semibold">
          Markdown
        </span>
      </div>
    </div>

    <div v-show="!showPreview" class="toolbar">

      <div class="heading-dropdown">
        <button
          type="button"
          class="toolbar-btn"
          @click="showHeadingMenu = !showHeadingMenu"
          title="Títulos"
        >
          H
        </button>
        <div v-if="showHeadingMenu" class="dropdown-menu">
          <button v-for="level in 6" :key="level" type="button" @click="insertHeading(level)">
            H{{ level }}
          </button>
        </div>
      </div>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="toggleBold" title="Negrito (Ctrl+B)">
        <strong>B</strong>
      </button>
      <button type="button" class="toolbar-btn" @click="toggleItalic" title="Itálico (Ctrl+I)">
        <em>I</em>
      </button>
      <button type="button" class="toolbar-btn" @click="toggleStrikethrough" title="Riscado">
        <s>S</s>
      </button>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="toggleInlineCode" title="Código inline (Ctrl+E)">
        <code>&lt;/&gt;</code>
      </button>
      <button type="button" class="toolbar-btn" @click="insertCodeBlock" title="Bloco de código">
        <span class="code-block-icon">{ }</span>
      </button>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="insertBlockquote" title="Citação">
        <span class="quote-icon">"</span>
      </button>
      <button type="button" class="toolbar-btn" @click="insertHorizontalRule" title="Linha horizontal">
        <span class="hr-icon">—</span>
      </button>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="insertBulletList" title="Lista">
        <span class="list-icon">•</span>
      </button>
      <button type="button" class="toolbar-btn" @click="insertNumberedList" title="Lista numerada">
        <span class="list-icon">1.</span>
      </button>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="openLinkModal" title="Link (Ctrl+K)">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>

      <button type="button" class="toolbar-btn" @click="openYoutubeModal" title="Vídeo YouTube">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>

      <span class="divider" />

      <button type="button" class="toolbar-btn" @click="openTableModal" title="Tabela">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      </button>

      <button type="button" class="toolbar-btn" @click="openLatexModal" title="Fórmula LaTeX">
        <span class="latex-icon">fx</span>
      </button>

      <button type="button" class="toolbar-btn" @click="openMermaidModal" title="Diagrama Mermaid">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div class="editor-area">
      <textarea
        v-show="!showPreview"
        ref="textareaRef"
        v-model="content"
        :placeholder="placeholder || 'Escreva em Markdown...'"
        :rows="rows || 6"
        class="editor-textarea"
        @keydown="handleKeydown"
        @paste="handlePaste"
      />
      <div v-show="showPreview" ref="previewRef" class="preview-area">
        <div v-if="!content.trim()" class="preview-empty">
          Nada para visualizar
        </div>
        <div v-else class="preview-content" v-html="renderedPreview" />
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showLinkModal" class="modal-overlay" @click.self="showLinkModal = false">
        <div class="modal">
          <h3>Inserir Link</h3>
          <input
            v-model="linkText"
            type="text"
            placeholder="Texto do link"
            class="modal-input"
          />
          <input
            v-model="linkUrl"
            type="url"
            placeholder="https://exemplo.com"
            class="modal-input"
            @keydown.enter="insertLink"
          />
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showLinkModal = false">Cancelar</button>
            <button type="button" class="btn-confirm" @click="insertLink">Inserir</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showYoutubeModal" class="modal-overlay" @click.self="showYoutubeModal = false">
        <div class="modal">
          <h3>Inserir Vídeo do YouTube</h3>
          <input
            v-model="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            class="modal-input"
            @keydown.enter="insertYoutube"
          />
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showYoutubeModal = false">Cancelar</button>
            <button type="button" class="btn-confirm" @click="insertYoutube">Inserir</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showTableModal" class="modal-overlay" @click.self="showTableModal = false">
        <div class="modal">
          <h3>Inserir Tabela</h3>
          <div class="table-inputs">
            <label>
              Linhas:
              <input v-model.number="tableRows" type="number" min="1" max="20" class="modal-input small" />
            </label>
            <label>
              Colunas:
              <input v-model.number="tableCols" type="number" min="1" max="10" class="modal-input small" />
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showTableModal = false">Cancelar</button>
            <button type="button" class="btn-confirm" @click="insertTable">Inserir</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showLatexModal" class="modal-overlay" @click.self="showLatexModal = false">
        <div class="modal">
          <h3>Inserir Fórmula LaTeX</h3>
          <textarea
            v-model="latexCode"
            placeholder="E = mc^2"
            class="modal-textarea"
            rows="3"
          />
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="showLatexModal = false">Cancelar</button>
            <button type="button" class="btn-secondary" @click="insertLatex(false)">Bloco</button>
            <button type="button" class="btn-confirm" @click="insertLatex(true)">Inline</button>
          </div>
        </div>
      </div>
    </Teleport>

    <MermaidInputModal
      :is-open="showMermaidModal"
      @close="showMermaidModal = false"
      @submit="handleMermaidSubmit"
    />
  </div>
</template>

<style scoped>
.markdown-editor {
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: rgb(30 41 59);
}

.editor-tabs {
  display: flex;
  background-color: rgb(51 65 85);
  border-bottom: 1px solid rgb(71 85 105);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  background-color: transparent;
  color: rgb(148 163 184);
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}

.tab-btn:hover {
  color: rgb(226 232 240);
  background-color: rgb(71 85 105 / 0.3);
}

.tab-btn.active {
  color: rgb(59 130 246);
  border-bottom-color: rgb(59 130 246);
  background-color: rgb(30 41 59);
}

.tab-icon {
  width: 16px;
  height: 16px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem;
  padding: 0.375rem;
  background-color: rgb(51 65 85);
  border-bottom: 1px solid rgb(71 85 105);
  align-items: center;
}

@media (min-width: 640px) {
  .toolbar {
    gap: 0.25rem;
    padding: 0.5rem;
  }
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0.25rem;
  background-color: transparent;
  color: rgb(203 213 225);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.15s;
}

@media (min-width: 640px) {
  .toolbar-btn {
    min-width: 32px;
    height: 32px;
    padding: 0.375rem;
    font-size: 0.875rem;
  }
}

.toolbar-btn:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.toolbar-btn.active {
  background-color: rgb(59 130 246);
  color: white;
}

.toolbar-btn .icon {
  width: 14px;
  height: 14px;
}

@media (min-width: 640px) {
  .toolbar-btn .icon {
    width: 18px;
    height: 18px;
  }
}

.toolbar-btn code {
  font-size: 0.75rem;
  background: none;
  padding: 0;
}

.toolbar-btn .code-block-icon,
.toolbar-btn .quote-icon,
.toolbar-btn .hr-icon,
.toolbar-btn .list-icon,
.toolbar-btn .latex-icon {
  font-size: 0.875rem;
  font-weight: 600;
}

.toolbar-btn .latex-icon {
  font-style: italic;
}

.divider {
  display: none;
  width: 1px;
  height: 24px;
  background-color: rgb(71 85 105);
  margin: 0 0.25rem;
}

@media (min-width: 640px) {
  .divider {
    display: block;
  }
}

.heading-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.25rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.375rem;
  padding: 0.25rem;
  z-index: 50;
  display: flex;
  gap: 0.25rem;
}

.dropdown-menu button {
  padding: 0.375rem 0.625rem;
  background: transparent;
  border: none;
  color: rgb(203 213 225);
  cursor: pointer;
  border-radius: 0.25rem;
  font-weight: 600;
}

.dropdown-menu button:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.error-message {
  padding: 0.5rem 1rem;
  background-color: rgb(127 29 29);
  color: rgb(254 202 202);
  font-size: 0.875rem;
  text-align: center;
}

.editor-area {
  min-height: 150px;
}

.editor-textarea {
  width: 100%;
  min-height: 150px;
  max-height: 500px;
  padding: 1rem;
  background-color: rgb(30 41 59);
  color: white;
  border: none;
  resize: none;
  overflow-y: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  outline: none;
  box-sizing: border-box;
}

.editor-textarea::placeholder {
  color: rgb(100 116 139);
}

.preview-area {
  padding: 1rem;
  min-height: 150px;
}

.preview-empty {
  color: rgb(100 116 139);
  font-style: italic;
  text-align: center;
  padding: 2rem 1rem;
}

.preview-content {
  color: rgb(226 232 240);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.preview-content :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
.preview-content :deep(h2) { font-size: 1.25rem; font-weight: 600; margin: 1rem 0 0.5rem; }
.preview-content :deep(h3) { font-size: 1.1rem; font-weight: 600; margin: 0.75rem 0 0.5rem; }
.preview-content :deep(p) { margin: 0.5rem 0; }
.preview-content :deep(a) { color: rgb(147 197 253); text-decoration: underline; }
.preview-content :deep(code) { background-color: rgb(51 65 85); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875rem; }
.preview-content :deep(pre) { background-color: rgb(30 41 59); padding: 1rem; border-radius: 0.375rem; overflow-x: auto; border: 1px solid rgb(51 65 85); }
.preview-content :deep(pre code) { background: none; padding: 0; }
.preview-content :deep(blockquote) { border-left: 3px solid rgb(59 130 246); padding-left: 1rem; color: rgb(148 163 184); margin: 0.5rem 0; }
.preview-content :deep(ul) { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: disc; }
.preview-content :deep(ol) { padding-left: 1.5rem; margin: 0.5rem 0; list-style-type: decimal; }
.preview-content :deep(li) { display: list-item; }
.preview-content :deep(hr) { border: none; border-top: 1px solid rgb(71 85 105); margin: 1rem 0; display: block; height: 0; }
.preview-content :deep(img) { max-width: 100%; border-radius: 0.375rem; }
.preview-content :deep(table) { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
.preview-content :deep(th), .preview-content :deep(td) { border: 1px solid rgb(71 85 105); padding: 0.5rem; text-align: left; }
.preview-content :deep(th) { background-color: rgb(51 65 85); }

/* Mermaid diagrams */
.preview-content :deep(.mermaid-diagram) {
  background-color: rgb(30 41 59);
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin: 0.5rem 0;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  color: rgb(148 163 184);
  white-space: pre-wrap;
}

.preview-content :deep(.mermaid-diagram.mermaid-rendered) {
  background-color: rgb(15 23 42);
  padding: 1rem;
  text-align: center;
  font-family: inherit;
  white-space: normal;
  color: inherit;
}

.preview-content :deep(.mermaid-diagram.mermaid-rendered svg) {
  max-width: 100%;
  height: auto;
}

.preview-content :deep(.mermaid-diagram.mermaid-error) {
  border: 1px solid rgb(239 68 68 / 0.5);
}

/* Syntax Highlighting (lowlight/highlight.js) */
.preview-content :deep(.hljs-comment),
.preview-content :deep(.hljs-quote) {
  color: rgb(100 116 139);
  font-style: italic;
}

.preview-content :deep(.hljs-keyword),
.preview-content :deep(.hljs-selector-tag) {
  color: rgb(249 115 22);
}

.preview-content :deep(.hljs-string),
.preview-content :deep(.hljs-addition) {
  color: rgb(74 222 128);
}

.preview-content :deep(.hljs-number),
.preview-content :deep(.hljs-literal) {
  color: rgb(251 146 60);
}

.preview-content :deep(.hljs-built_in),
.preview-content :deep(.hljs-builtin-name) {
  color: rgb(56 189 248);
}

.preview-content :deep(.hljs-type),
.preview-content :deep(.hljs-params) {
  color: rgb(251 191 36);
}

.preview-content :deep(.hljs-meta) {
  color: rgb(167 139 250);
}

.preview-content :deep(.hljs-function),
.preview-content :deep(.hljs-title) {
  color: rgb(96 165 250);
}

.preview-content :deep(.hljs-attr),
.preview-content :deep(.hljs-attribute) {
  color: rgb(34 211 238);
}

.preview-content :deep(.hljs-variable),
.preview-content :deep(.hljs-template-variable) {
  color: rgb(244 114 182);
}

.preview-content :deep(.hljs-regexp),
.preview-content :deep(.hljs-link) {
  color: rgb(248 113 113);
}

.preview-content :deep(.hljs-symbol),
.preview-content :deep(.hljs-bullet) {
  color: rgb(192 132 252);
}

.preview-content :deep(.hljs-section) {
  color: rgb(96 165 250);
  font-weight: 700;
}

.preview-content :deep(.hljs-name),
.preview-content :deep(.hljs-selector-id),
.preview-content :deep(.hljs-selector-class) {
  color: rgb(34 211 238);
}

.preview-content :deep(.hljs-deletion) {
  color: rgb(248 113 113);
  background-color: rgb(127 29 29 / 0.3);
}

.preview-content :deep(.hljs-addition) {
  background-color: rgb(20 83 45 / 0.3);
}

.preview-content :deep(.hljs-emphasis) {
  font-style: italic;
}

.preview-content :deep(.hljs-strong) {
  font-weight: 700;
}

/* Modais */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background-color: rgb(30 41 59);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  padding: 1.5rem;
  min-width: 320px;
  max-width: 90vw;
}

.modal-large {
  min-width: 480px;
}

.modal h3 {
  color: white;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.modal-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.375rem;
  color: white;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  outline: none;
}

.modal-input:focus {
  border-color: rgb(59 130 246);
}

.modal-input.small {
  width: 80px;
  text-align: center;
}

.modal-textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.375rem;
  color: white;
  font-size: 0.875rem;
  font-family: ui-monospace, monospace;
  margin-bottom: 0.75rem;
  resize: vertical;
  outline: none;
}

.modal-textarea:focus {
  border-color: rgb(59 130 246);
}

.table-inputs {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.table-inputs label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgb(203 213 225);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.5rem 1rem;
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-cancel:hover {
  background-color: rgb(71 85 105);
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background-color: rgb(71 85 105);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-secondary:hover {
  background-color: rgb(100 116 139);
}

.btn-confirm {
  padding: 0.5rem 1rem;
  background-color: rgb(59 130 246);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-confirm:hover {
  background-color: rgb(37 99 235);
}
</style>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import { StarterKit } from '@tiptap/starter-kit'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { Underline } from '@tiptap/extension-underline'
import { Highlight } from '@tiptap/extension-highlight'
import { TextAlign } from '@tiptap/extension-text-align'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Youtube } from '@tiptap/extension-youtube'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Placeholder } from '@tiptap/extension-placeholder'
import { onMounted, onBeforeUnmount, watch, ref, computed } from 'vue'
import { htmlToMarkdown } from '~/utils/htmlToMarkdown'
import { LatexExtension } from '~/extensions/LatexExtension'
import { MermaidExtension } from '~/extensions/MermaidExtension'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  onImageUpload?: (file: File) => string // Retorna o URL (Object URL ou path)
  initialMode?: 'html' | 'markdown'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:editorMode': [mode: 'html' | 'markdown']
}>()

const editorMode = ref<'html' | 'markdown'>(props.initialMode || 'html')
const currentColor = ref('#ffffff')
const showHeadingMenu = ref(false)
const showTableMenu = ref(false)
const showImageMenu = ref(false)

// Estados dos modais de URL
const showLinkModal = ref(false)
const showMarkdownLinkModal = ref(false)
const showImageUrlModal = ref(false)
const showVideoModal = ref(false)
const showLatexModal = ref(false)
const showMermaidModal = ref(false)
const showLanguageSelector = ref(false)

const isMarkdownMode = computed(() => editorMode.value === 'markdown')

// Recursos que existem apenas em HTML e não são suportados em Markdown
interface IncompatibleFeature {
  id: string
  name: string
  count: number
}

const showIncompatibleModal = ref(false)
const incompatibleFeatures = ref<IncompatibleFeature[]>([])

/**
 * Detecta recursos HTML-only presentes no conteúdo atual
 */
const detectHtmlOnlyFeatures = (): IncompatibleFeature[] => {
  if (!editor.value) return []

  const html = editor.value.getHTML()
  const features: IncompatibleFeature[] = []

  // Cor do texto (style="color:...")
  // Extrai todas as cores e filtra as que não são brancas
  const colorRegex = /style="[^"]*color:\s*([^;"]+)/gi
  let colorMatch
  let nonWhiteColorCount = 0

  while ((colorMatch = colorRegex.exec(html)) !== null) {
    const colorValue = colorMatch[1].trim().toLowerCase()
    // Ignora cores brancas (padrão)
    const isWhite = colorValue === '#ffffff' ||
                    colorValue === '#fff' ||
                    colorValue === 'white' ||
                    colorValue === 'rgb(255, 255, 255)' ||
                    colorValue === 'rgb(255,255,255)'
    if (!isWhite) {
      nonWhiteColorCount++
    }
  }

  if (nonWhiteColorCount > 0) {
    features.push({ id: 'color', name: 'Cores de texto', count: nonWhiteColorCount })
  }

  // Highlight/marcador (<mark>)
  const highlightMatches = html.match(/<mark[^>]*>/gi)
  if (highlightMatches && highlightMatches.length > 0) {
    features.push({ id: 'highlight', name: 'Texto destacado (marcador)', count: highlightMatches.length })
  }

  // Subscrito (<sub>)
  const subMatches = html.match(/<sub>/gi)
  if (subMatches && subMatches.length > 0) {
    features.push({ id: 'subscript', name: 'Subscrito', count: subMatches.length })
  }

  // Sobrescrito (<sup>)
  const supMatches = html.match(/<sup>/gi)
  if (supMatches && supMatches.length > 0) {
    features.push({ id: 'superscript', name: 'Sobrescrito', count: supMatches.length })
  }

  // Alinhamento de texto (text-align: center/right)
  const alignMatches = html.match(/text-align:\s*(center|right)/gi)
  if (alignMatches && alignMatches.length > 0) {
    features.push({ id: 'alignment', name: 'Alinhamento de texto', count: alignMatches.length })
  }

  // Task lists (<ul data-type="taskList">)
  const taskListMatches = html.match(/<ul[^>]*data-type="taskList"/gi)
  if (taskListMatches && taskListMatches.length > 0) {
    features.push({ id: 'taskList', name: 'Lista de tarefas', count: taskListMatches.length })
  }

  // Células mescladas (colspan ou rowspan > 1)
  const mergedCellMatches = html.match(/(colspan|rowspan)=["']([2-9]|\d{2,})["']/gi)
  if (mergedCellMatches && mergedCellMatches.length > 0) {
    features.push({ id: 'mergedCells', name: 'Células mescladas em tabela', count: mergedCellMatches.length })
  }

  // Cabeçalho vertical em tabela (th dentro de td's row - difícil detectar, simplificando)
  // Verificar se há <th> que não está na primeira linha
  const hasVerticalHeader = /<tr>(?!<th).*<th/gi.test(html)
  if (hasVerticalHeader) {
    features.push({ id: 'verticalHeader', name: 'Cabeçalho vertical em tabela', count: 1 })
  }

  return features
}

/**
 * Tenta trocar o modo do editor, verificando compatibilidade
 */
const tryChangeMode = (newMode: 'html' | 'markdown') => {
  if (newMode === editorMode.value) return

  // MD → HTML: sempre permitido (sem perda)
  if (newMode === 'html') {
    editorMode.value = 'html'
    emit('update:editorMode', 'html')
    return
  }

  // HTML → MD: verificar recursos incompatíveis
  const features = detectHtmlOnlyFeatures()

  if (features.length > 0) {
    incompatibleFeatures.value = features
    showIncompatibleModal.value = true
  } else {
    editorMode.value = 'markdown'
    emit('update:editorMode', 'markdown')
  }
}

/**
 * Força a troca para Markdown mesmo com recursos incompatíveis
 */
const forceChangeToMarkdown = () => {
  showIncompatibleModal.value = false
  incompatibleFeatures.value = []
  editorMode.value = 'markdown'
  emit('update:editorMode', 'markdown')
}

const cancelModeChange = () => {
  showIncompatibleModal.value = false
  incompatibleFeatures.value = []
}

const toggleEditorMode = () => {
  const newMode = editorMode.value === 'html' ? 'markdown' : 'html'
  tryChangeMode(newMode)
}

const lowlight = createLowlight(common)

// Regex para detectar URLs de YouTube
const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:\S*)?/

// Regex para detectar URLs de imagens
const imageUrlRegex = /^https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?\S*)?$/i

// Extrai o ID do vídeo do YouTube de uma URL
const extractYoutubeId = (url: string): string | null => {
  const match = url.match(youtubeRegex)
  return match?.[1] ?? null
}

// Verifica se é uma URL de imagem
const isImageUrl = (url: string): boolean => {
  return imageUrlRegex.test(url.trim())
}

const editor = useEditor({
  content: props.modelValue || '',
  editorProps: {
    handlePaste: (_view, event) => {
      const clipboardData = event.clipboardData
      if (!clipboardData) return false

      const text = clipboardData.getData('text/plain').trim()
      if (!text) return false

      // Verifica se é URL do YouTube
      const youtubeId = extractYoutubeId(text)
      if (youtubeId) {
        event.preventDefault()

        if (isMarkdownMode.value) {
          // No modo Markdown, insere thumbnail
          editor.value?.chain().focus().setImage({
            src: `https://img.youtube.com/vi/${youtubeId}/0.jpg`,
            alt: `youtube:${youtubeId}`
          }).run()
        } else {
          // No modo HTML, insere o player
          editor.value?.commands.setYoutubeVideo({
            src: `https://www.youtube.com/watch?v=${youtubeId}`,
            width: 640,
            height: 480,
          })
        }
        return true
      }

      // Verifica se é URL de imagem
      if (isImageUrl(text)) {
        event.preventDefault()
        editor.value?.chain().focus().setImage({ src: text }).run()
        return true
      }

      return false
    },
  },
  extensions: [
    StarterKit.configure({
      codeBlock: false, // Desabilitado para usar CodeBlockLowlight
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
    }),
    Underline,
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'editor-link',
      },
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    Youtube.configure({
      controls: true,
      nocookie: true,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Subscript,
    Superscript,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    TextStyle,
    Color,
    CharacterCount,
    Placeholder.configure({
      placeholder: props.placeholder || 'Comece a escrever...',
    }),
    LatexExtension,
    MermaidExtension,
  ],
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
  onCreate: ({ editor }) => {
    editor.chain().setColor('#ffffff').run()
  },
})

// Detecta se o cursor está em um bloco de código e qual a linguagem atual
const isInCodeBlock = computed(() => editor.value?.isActive('codeBlock') ?? false)
const currentCodeLanguage = computed(() => {
  if (!editor.value || !isInCodeBlock.value) return ''
  return editor.value.getAttributes('codeBlock').language || 'plaintext'
})

const setCodeLanguage = (language: string) => {
  editor.value?.chain().focus().updateAttributes('codeBlock', { language }).run()
  showLanguageSelector.value = false
}

// Fecha os dropdowns ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // Fecha seletor de linguagem
  if (!target.closest('.language-selector-wrapper')) {
    showLanguageSelector.value = false
  }

  // Fecha menu de títulos
  if (!target.closest('.heading-dropdown')) {
    showHeadingMenu.value = false
  }

  // Fecha menu de tabela
  if (!target.closest('.table-dropdown')) {
    showTableMenu.value = false
  }

  // Fecha menu de imagem
  if (!target.closest('.image-dropdown')) {
    showImageMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  editor.value?.destroy()
  document.removeEventListener('click', handleClickOutside)
})

watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value || '')
  }
})

/**
 * Converte thumbnails de YouTube (formato MD) para iframes (formato HTML)
 * Procura por imagens com URL de thumbnail do YouTube e substitui por embed
 */
const convertYoutubeThumbnailsToIframes = () => {
  if (!editor.value) return

  const html = editor.value.getHTML()
  // Regex para encontrar imagens com src de thumbnail do YouTube
  // Formato: https://img.youtube.com/vi/VIDEO_ID/0.jpg (ou outras variações como maxresdefault.jpg)
  const thumbnailRegex = /<img[^>]*src="https:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/[^"]*"[^>]*\/?>/gi

  let newHtml = html
  let match

  while ((match = thumbnailRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const videoId = match[1]

    // Cria o HTML do iframe do YouTube (mesmo formato que o Tiptap usa)
    const iframeHtml = `<div data-youtube-video><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" allowfullscreen="true"></iframe></div>`

    newHtml = newHtml.replace(fullMatch, iframeHtml)
  }

  if (newHtml !== html) {
    editor.value.commands.setContent(newHtml)
  }
}

/**
 * Converte iframes de YouTube (formato HTML) para thumbnails (formato MD)
 * Procura por divs com data-youtube-video e substitui por imagem com alt especial
 */
const convertYoutubeIframesToThumbnails = () => {
  if (!editor.value) return

  const html = editor.value.getHTML()
  // Regex para encontrar divs de YouTube com iframe
  const iframeRegex = /<div[^>]*data-youtube-video[^>]*>.*?<iframe[^>]*src="[^"]*(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]+)[^"]*"[^>]*>.*?<\/iframe>.*?<\/div>/gi

  let newHtml = html
  let match

  while ((match = iframeRegex.exec(html)) !== null) {
    const fullMatch = match[0]
    const videoId = match[1]

    // Cria a imagem com alt especial para identificar como vídeo no modo MD
    const thumbnailHtml = `<img src="https://img.youtube.com/vi/${videoId}/0.jpg" alt="youtube:${videoId}">`

    newHtml = newHtml.replace(fullMatch, thumbnailHtml)
  }

  if (newHtml !== html) {
    editor.value.commands.setContent(newHtml)
  }
}

// Watcher para converter vídeos quando o modo muda
watch(editorMode, (newMode, oldMode) => {
  if (newMode === oldMode) return

  if (newMode === 'html' && oldMode === 'markdown') {
    // MD → HTML: converter thumbnails para iframes
    convertYoutubeThumbnailsToIframes()
  } else if (newMode === 'markdown' && oldMode === 'html') {
    // HTML → MD: converter iframes para thumbnails
    convertYoutubeIframesToThumbnails()
  }

  emit('update:editorMode', newMode)
})

const characterCount = computed(() => editor.value?.storage.characterCount.characters() || 0)
const wordCount = computed(() => editor.value?.storage.characterCount.words() || 0)

const changeColor = (event: Event) => {
  const target = event.target as HTMLInputElement
  currentColor.value = target.value
  editor.value?.chain().focus().setColor(target.value).run()
}

const setHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
  editor.value?.chain().focus().toggleHeading({ level }).run()
  showHeadingMenu.value = false
}

const openLinkModal = () => {
  if (isMarkdownMode.value) {
    showMarkdownLinkModal.value = true
  } else {
    showLinkModal.value = true
  }
}

const handleLinkSubmit = (url: string) => {
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  showLinkModal.value = false
}

const handleMarkdownLinkSubmit = (text: string, url: string) => {
  // Insere o texto com o link aplicado (será convertido para [text](url) no export)
  editor.value?.chain().focus().insertContent({
    type: 'text',
    text: text,
    marks: [{ type: 'link', attrs: { href: url } }]
  }).run()
  showMarkdownLinkModal.value = false
}

const removeLink = () => {
  editor.value?.chain().focus().unsetLink().run()
}

const openImageUrlModal = () => {
  showImageUrlModal.value = true
  showImageMenu.value = false
}

const handleImageUrlSubmit = (url: string) => {
  editor.value?.chain().focus().setImage({ src: url }).run()
  showImageUrlModal.value = false
}

// Limite de tamanho de imagem: 600KB
const MAX_IMAGE_SIZE = 600 * 1024
const imageError = ref('')

const validateImageSize = (file: File): boolean => {
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeKB = Math.round(file.size / 1024)
    imageError.value = `Imagem muito grande (${sizeKB}KB). Tamanho máximo: 600KB`
    setTimeout(() => { imageError.value = '' }, 5000)
    return false
  }
  return true
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    if (!validateImageSize(file)) {
      target.value = ''
      showImageMenu.value = false
      return
    }

    if (props.onImageUpload) {
      // Usa a função do pai para obter o URL (Object URL gerenciado externamente)
      const imageUrl = props.onImageUpload(file)
      editor.value?.chain().focus().setImage({ src: imageUrl }).run()
    } else {
      // Fallback: usa base64 (comportamento antigo)
      const reader = new FileReader()
      reader.onload = () => {
        const imageUrl = reader.result as string
        editor.value?.chain().focus().setImage({ src: imageUrl }).run()
      }
      reader.readAsDataURL(file)
    }
  }
  target.value = '' // Reset input para permitir mesmo arquivo novamente
  showImageMenu.value = false
}

/**
 * Extrai o ID do vídeo de uma URL do YouTube
 */
const extractYoutubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

const openVideoModal = () => {
  showVideoModal.value = true
}

const handleVideoSubmit = (url: string) => {
  //no modo Markdown, insere a thumbnail como imagem para preview
  //a conversão para o formato markdown com link é feita no htmlToMarkdown
  if (isMarkdownMode.value) {
    const videoId = extractYoutubeVideoId(url)
    if (videoId) {
      //insere a imagem da thumbnail com alt text especial para identificar como vídeo
      //formato do alt: "youtube:VIDEO_ID" permite identificar na conversão
      editor.value?.chain().focus().setImage({
        src: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        alt: `youtube:${videoId}`
      }).run()
    } else {
      //se não conseguir extrair o ID, insere apenas o link como texto
      editor.value?.chain().focus().insertContent(`[Assista no YouTube](${url})`).run()
    }
  } else {
    //no modo HTML, usa o embed normal do YouTube
    editor.value?.commands.setYoutubeVideo({
      src: url,
      width: 640,
      height: 480,
    })
  }
  showVideoModal.value = false
}

const insertTable = () => {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  showTableMenu.value = false
}

const openLatexModal = () => {
  showLatexModal.value = true
}

const handleLatexSubmit = (latex: string) => {
  editor.value?.chain().focus().insertLatex(latex).run()
  showLatexModal.value = false
}

const openMermaidModal = () => {
  showMermaidModal.value = true
}

const handleMermaidSubmit = (mermaidCode: string) => {
  editor.value?.chain().focus().insertMermaid(mermaidCode).run()
  showMermaidModal.value = false
}

const getHTML = () => editor.value?.getHTML() || ''
const getText = () => editor.value?.getText() || ''
const isEmpty = () => editor.value?.isEmpty ?? true
const clearContent = () => editor.value?.commands.clearContent()

const getIsMarkdownMode = (): boolean => {
  return editorMode.value === 'markdown'
}

const getContent = (): string => {
  const html = getHTML()
  if (getIsMarkdownMode()) {
    return htmlToMarkdown(html)
  }
  return html
}

defineExpose({
  editorMode,
  isMarkdownMode,
  getIsMarkdownMode,
  getHTML,
  getContent,
  getText,
  isEmpty,
  clearContent,
  editor
})
</script>

<template>
  <div class="tiptap-editor">
    <div v-if="editor" class="toolbar">
      <div class="mode-toggle">
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: !isMarkdownMode }"
          @click="tryChangeMode('html')"
        >
          HTML
        </button>
        <button
          type="button"
          class="toggle-btn"
          :class="{ active: isMarkdownMode }"
          @click="tryChangeMode('markdown')"
        >
          MD
        </button>
      </div>

      <span class="divider" />

      <div v-if="!isMarkdownMode" class="toolbar-group">
        <input
          type="color"
          :value="currentColor"
          @input="changeColor"
          class="color-picker"
          title="Cor do texto"
        />
      </div>

      <span v-if="!isMarkdownMode" class="divider" />

      <div class="dropdown heading-dropdown">
        <button
          type="button"
          class="toolbar-btn"
          @click="showHeadingMenu = !showHeadingMenu"
          title="Títulos"
        >
          <img src="/icons/editor/text-size.png" alt="Títulos" class="toolbar-icon" />
        </button>
        <div v-if="showHeadingMenu" class="dropdown-menu">
          <button type="button" @click="setHeading(1)" :class="{ active: editor.isActive('heading', { level: 1 }) }">
            <span style="font-size: 1.5rem; font-weight: bold;">Título 1</span>
          </button>
          <button type="button" @click="setHeading(2)" :class="{ active: editor.isActive('heading', { level: 2 }) }">
            <span style="font-size: 1.25rem; font-weight: bold;">Título 2</span>
          </button>
          <button type="button" @click="setHeading(3)" :class="{ active: editor.isActive('heading', { level: 3 }) }">
            <span style="font-size: 1.1rem; font-weight: bold;">Título 3</span>
          </button>
          <button type="button" @click="setHeading(4)" :class="{ active: editor.isActive('heading', { level: 4 }) }">
            <span style="font-size: 1rem; font-weight: bold;">Título 4</span>
          </button>
          <button type="button" @click="setHeading(5)" :class="{ active: editor.isActive('heading', { level: 5 }) }">
            <span style="font-size: 0.9rem; font-weight: bold;">Título 5</span>
          </button>
          <button type="button" @click="setHeading(6)" :class="{ active: editor.isActive('heading', { level: 6 }) }">
            <span style="font-size: 0.8rem; font-weight: bold;">Título 6</span>
          </button>
        </div>
      </div>

      <span class="divider" />

      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleHighlight().run()"
        :class="{ active: editor.isActive('highlight') }"
        title="Destacar"
      >
        <img src="/icons/editor/highlight.png" alt="Destacar" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ active: editor.isActive('bold') }"
        title="Negrito"
      >
        <img src="/icons/editor/bold.png" alt="Negrito" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ active: editor.isActive('italic') }"
        title="Itálico"
      >
        <img src="/icons/editor/italic.png" alt="Itálico" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ active: editor.isActive('underline') }"
        title="Sublinhado"
      >
        <img src="/icons/editor/underlined.png" alt="Sublinhado" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ active: editor.isActive('strike') }"
        title="Riscado"
      >
        <img src="/icons/editor/strike.png" alt="Riscado" class="toolbar-icon" />
      </button>

      <span class="divider" />

      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ active: editor.isActive('code') }"
        title="Código inline"
      >
        <img src="/icons/editor/code.png" alt="Código" class="toolbar-icon" />
      </button>
      <div class="code-block-group">
        <button
          type="button"
          class="toolbar-btn"
          @click="editor.chain().focus().toggleCodeBlock().run()"
          :class="{ active: editor.isActive('codeBlock') }"
          title="Bloco de código"
        >
          <img src="/icons/editor/code-block.png" alt="Bloco de código" class="toolbar-icon" />
        </button>
        <div v-if="isInCodeBlock" class="language-selector-wrapper">
          <button
            type="button"
            class="language-btn"
            @click="showLanguageSelector = !showLanguageSelector"
            title="Selecionar linguagem"
          >
            {{ currentCodeLanguage || 'plaintext' }}
            <svg class="chevron-icon" :class="{ rotated: showLanguageSelector }" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
          <CodeLanguageSelector
            :current-language="currentCodeLanguage"
            :is-visible="showLanguageSelector"
            @select="setCodeLanguage"
            @close="showLanguageSelector = false"
          />
        </div>
      </div>

      <span class="divider" />

      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ active: editor.isActive('blockquote') }"
        title="Citação"
      >
        <img src="/icons/editor/quote.png" alt="Citação" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().setHorizontalRule().run()"
        title="Linha horizontal"
      >
        <img src="/icons/editor/line.png" alt="Linha" class="toolbar-icon" />
      </button>

      <span v-if="!isMarkdownMode" class="divider" />

      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleSubscript().run()"
        :class="{ active: editor.isActive('subscript') }"
        title="Subscrito"
      >
        <img src="/icons/editor/sobrescriopt.png" alt="Subscrito" class="toolbar-icon" />
      </button>
      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleSuperscript().run()"
        :class="{ active: editor.isActive('superscript') }"
        title="Sobrescrito"
      >
        <img src="/icons/editor/superscript.png" alt="Sobrescrito" class="toolbar-icon" />
      </button>

      <span v-if="!isMarkdownMode" class="divider" />

      <button
        type="button"
        class="toolbar-btn"
        @click="!isMarkdownMode && editor.isActive('link') ? removeLink() : openLinkModal()"
        :class="{ active: !isMarkdownMode && editor.isActive('link') }"
        title="Link"
      >
        <img src="/icons/editor/link.png" alt="Link" class="toolbar-icon" />
      </button>

      <div class="dropdown image-dropdown">
        <button
          type="button"
          class="toolbar-btn"
          @click="showImageMenu = !showImageMenu"
          title="Imagem"
        >
          <img src="/icons/editor/image.png" alt="Imagem" class="toolbar-icon" />
        </button>
        <div v-if="showImageMenu" class="dropdown-menu">
          <button type="button" @click="openImageUrlModal">URL da imagem</button>
          <label class="file-label">
            Upload
            <input type="file" @change="onFileChange" accept="image/*" hidden />
          </label>
        </div>
      </div>

      <button
        type="button"
        class="toolbar-btn"
        @click="openVideoModal"
        title="Vídeo YouTube"
      >
        <img src="/icons/editor/video.png" alt="Vídeo" class="toolbar-icon" />
      </button>

      <span class="divider" />

      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleTaskList().run()"
        :class="{ active: editor.isActive('taskList') }"
        title="Lista de tarefas"
      >
        <img src="/icons/editor/check-list.png" alt="Lista de tarefas" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ active: editor.isActive('bulletList') }"
        title="Lista"
      >
        <img src="/icons/editor/toggle-list.png" alt="Lista" class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ active: editor.isActive('orderedList') }"
        title="Lista numerada"
      >
        <img src="/icons/editor/ordered-list.png" alt="Lista numerada" class="toolbar-icon" />
      </button>

      <span class="divider" />

      <div class="dropdown table-dropdown">
        <button
          type="button"
          class="toolbar-btn"
          @click="showTableMenu = !showTableMenu"
          title="Tabela"
        >
          <img src="/icons/editor/table.png" alt="Tabela" class="toolbar-icon" />
        </button>
        <div v-if="showTableMenu" class="dropdown-menu table-menu">
          <button type="button" @click="insertTable">Nova Tabela</button>
          <button type="button" @click="editor.chain().focus().deleteTable().run()">Deletar Tabela</button>
          <hr />
          <button type="button" @click="editor.chain().focus().addColumnBefore().run()">+ Coluna antes</button>
          <button type="button" @click="editor.chain().focus().addColumnAfter().run()">+ Coluna depois</button>
          <button type="button" @click="editor.chain().focus().deleteColumn().run()">Deletar coluna</button>
          <hr />
          <button type="button" @click="editor.chain().focus().addRowBefore().run()">+ Linha antes</button>
          <button type="button" @click="editor.chain().focus().addRowAfter().run()">+ Linha depois</button>
          <button type="button" @click="editor.chain().focus().deleteRow().run()">Deletar linha</button>
          <hr />
          <button type="button" @click="editor.chain().focus().toggleHeaderRow().run()">Cabeçalho horizontal</button>
          <button v-if="!isMarkdownMode" type="button" @click="editor.chain().focus().toggleHeaderColumn().run()">Cabeçalho vertical</button>
          <button v-if="!isMarkdownMode" type="button" @click="editor.chain().focus().mergeOrSplit().run()">Juntar/Separar células</button>
        </div>
      </div>

      <button
        type="button"
        class="toolbar-btn"
        @click="openLatexModal"
        title="Formula LaTeX"
      >
        <span style="font-style: italic; font-weight: bold;">fx</span>
      </button>

      <button
        type="button"
        class="toolbar-btn"
        @click="openMermaidModal"
        title="Diagrama Mermaid"
      >
        <img src="/icons/editor/diagram.png" alt="Diagrama" class="toolbar-icon" />
      </button>

      <span v-if="!isMarkdownMode" class="divider" />

      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().setTextAlign('left').run()"
        :class="{ active: editor.isActive({ textAlign: 'left' }) }"
        title="Alinhar à esquerda"
      >
        <img src="/icons/editor/left-aligned.png" alt="Esquerda" class="toolbar-icon" />
      </button>
      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().setTextAlign('center').run()"
        :class="{ active: editor.isActive({ textAlign: 'center' }) }"
        title="Centralizar"
      >
        <img src="/icons/editor/center-aligned.png" alt="Centro" class="toolbar-icon" />
      </button>
      <button
        v-if="!isMarkdownMode"
        type="button"
        class="toolbar-btn"
        @click="editor.chain().focus().setTextAlign('right').run()"
        :class="{ active: editor.isActive({ textAlign: 'right' }) }"
        title="Alinhar à direita"
      >
        <img src="/icons/editor/right-aligned.png" alt="Direita" class="toolbar-icon" />
      </button>
      <div class="counter">
        Caracteres: {{ characterCount }} — Palavras: {{ wordCount }}
      </div>
    </div>

    <div v-if="imageError" class="image-error">
      {{ imageError }}
    </div>

    <EditorContent :editor="editor" />

    <UrlInputModal
      :is-open="showLinkModal"
      title="Inserir Link"
      placeholder="https://exemplo.com"
      submit-label="Inserir Link"
      @close="showLinkModal = false"
      @submit="handleLinkSubmit"
    />

    <MarkdownLinkModal
      :is-open="showMarkdownLinkModal"
      @close="showMarkdownLinkModal = false"
      @submit="handleMarkdownLinkSubmit"
    />

    <UrlInputModal
      :is-open="showImageUrlModal"
      title="Inserir Imagem"
      placeholder="https://exemplo.com/imagem.jpg"
      submit-label="Inserir Imagem"
      @close="showImageUrlModal = false"
      @submit="handleImageUrlSubmit"
    />

    <UrlInputModal
      :is-open="showVideoModal"
      title="Inserir Video do YouTube"
      placeholder="https://www.youtube.com/watch?v=..."
      submit-label="Inserir Video"
      @close="showVideoModal = false"
      @submit="handleVideoSubmit"
    />

    <LatexInputModal
      :is-open="showLatexModal"
      @close="showLatexModal = false"
      @submit="handleLatexSubmit"
    />

    <MermaidInputModal
      :is-open="showMermaidModal"
      @close="showMermaidModal = false"
      @submit="handleMermaidSubmit"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showIncompatibleModal" class="modal-overlay" @click.self="cancelModeChange">
          <div class="modal-content incompatible-modal">
            <div class="modal-header">
              <svg xmlns="http://www.w3.org/2000/svg" class="warning-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3>Recursos incompatíveis com Markdown</h3>
            </div>

            <p class="modal-description">
              O seu conteúdo possui recursos que não são suportados pelo formato Markdown.
              Se você continuar, esses recursos serão perdidos:
            </p>

            <ul class="features-list">
              <li v-for="feature in incompatibleFeatures" :key="feature.id">
                <span class="feature-name">{{ feature.name }}</span>
                <span class="feature-count">{{ feature.count }} {{ feature.count === 1 ? 'ocorrência' : 'ocorrências' }}</span>
              </li>
            </ul>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" @click="cancelModeChange">
                Cancelar
              </button>
              <button type="button" class="btn-confirm" @click="forceChangeToMarkdown">
                Continuar mesmo assim
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tiptap-editor {
  border: 1px solid rgb(51 65 85);
  border-radius: 0.5rem;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.5rem;
  background-color: rgb(51 65 85);
  border-bottom: 1px solid rgb(71 85 105);
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 40;
  border-radius: 0.5rem 0.5rem 0 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
}

.mode-toggle {
  display: flex;
  background-color: rgb(30 41 59);
  border-radius: 0.375rem;
  padding: 2px;
}

.toggle-btn {
  padding: 0.25rem 0.5rem;
  background-color: transparent;
  color: rgb(148 163 184);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.15s;
}

.toggle-btn:hover {
  color: rgb(203 213 225);
}

.toggle-btn.active {
  background-color: rgb(59 130 246);
  color: white;
}

.toolbar-btn {
  padding: 0.375rem 0.625rem;
  background-color: transparent;
  color: rgb(203 213 225);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.toolbar-btn.active {
  background-color: rgb(59 130 246);
  color: white;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  padding: 0;
}

.toolbar-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  filter: brightness(0) invert(1);
  opacity: 0.85;
}

.toolbar-btn:hover .toolbar-icon {
  opacity: 1;
}

.toolbar-btn.active .toolbar-icon {
  opacity: 1;
}

.divider {
  width: 1px;
  height: 24px;
  background-color: rgb(71 85 105);
  margin: 0 0.25rem;
}

.code-block-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.language-selector-wrapper {
  position: relative;
}

.language-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: rgb(30 41 59);
  color: rgb(148 163 184);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, monospace;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.language-btn:hover {
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
  border-color: rgb(100 116 139);
}

.chevron-icon {
  width: 12px;
  height: 12px;
  transition: transform 0.15s;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: rgb(51 65 85);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.375rem;
  padding: 0.25rem;
  z-index: 50;
  min-width: 150px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.dropdown-menu button,
.dropdown-menu .file-label {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  color: rgb(203 213 225);
  text-align: left;
  cursor: pointer;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.dropdown-menu button:hover,
.dropdown-menu .file-label:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.dropdown-menu button.active {
  background-color: rgb(59 130 246);
  color: white;
}

.dropdown-menu hr {
  border: none;
  border-top: 1px solid rgb(71 85 105);
  margin: 0.25rem 0;
}

.table-menu {
  min-width: 180px;
}

.counter {
  margin-left: auto;
  padding: 0.25rem 0.5rem;
  color: rgb(148 163 184);
  font-size: 0.75rem;
}

.image-error {
  padding: 0.5rem 1rem;
  background-color: rgb(127 29 29);
  color: rgb(254 202 202);
  font-size: 0.875rem;
  text-align: center;
}

.tiptap-editor :deep(.tiptap) {
  min-height: 300px;
  padding: 1rem;
  background-color: rgb(30 41 59);
  color: white;
  outline: none;
  border-radius: 0 0 0.5rem 0.5rem;
}

.tiptap-editor :deep(.tiptap p.is-editor-empty:first-child::before) {
  color: rgb(100 116 139);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.tiptap-editor :deep(.tiptap h1) {
  font-size: 2rem;
  font-weight: 700;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap h4) {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap h5) {
  font-size: 1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap h6) {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.tiptap-editor :deep(.tiptap ul),
.tiptap-editor :deep(.tiptap ol) {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

.tiptap-editor :deep(.tiptap ul) {
  list-style-type: disc;
}

.tiptap-editor :deep(.tiptap ol) {
  list-style-type: decimal;
}

.tiptap-editor :deep(.tiptap ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

.tiptap-editor :deep(.tiptap ul[data-type="taskList"] li) {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.tiptap-editor :deep(.tiptap ul[data-type="taskList"] li > label) {
  flex: 0 0 auto;
  margin-right: 0.5rem;
  user-select: none;
}

.tiptap-editor :deep(.tiptap ul[data-type="taskList"] li > div) {
  flex: 1 1 auto;
}

.tiptap-editor :deep(.tiptap blockquote) {
  border-left: 3px solid rgb(59 130 246);
  margin: 0.5rem 0;
  color: rgb(148 163 184);
  background-color: rgb(51 65 85);
  border-radius: 0 0.25rem 0.25rem 0;
  padding: 0.5rem 1rem 0.5rem 1.5rem;
}

.tiptap-editor :deep(.tiptap pre) {
  background-color: rgb(15 23 42);
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.tiptap-editor :deep(.tiptap code) {
  font-family: ui-monospace, monospace;
  font-size: 0.875rem;
  background-color: rgb(51 65 85);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}

.tiptap-editor :deep(.tiptap pre code) {
  background: none;
  padding: 0;
}

.tiptap-editor :deep(.tiptap hr) {
  border: none;
  border-top: 2px solid rgb(71 85 105);
  margin: 1rem 0;
}

.tiptap-editor :deep(.tiptap a),
.tiptap-editor :deep(.tiptap .editor-link) {
  color: rgb(147 197 253);
  cursor: pointer;
  text-decoration: underline;
}

.tiptap-editor :deep(.tiptap a:hover),
.tiptap-editor :deep(.tiptap .editor-link:hover) {
  color: rgb(191 219 254);
}

.tiptap-editor :deep(.tiptap img),
.tiptap-editor :deep(.tiptap .editor-image) {
  max-width: 100%;
  height: auto;
  border-radius: 0.375rem;
  margin: 1rem 0;
}

.tiptap-editor :deep(.tiptap img.ProseMirror-selectednode) {
  outline: 3px solid rgb(59 130 246);
}

.tiptap-editor :deep(.tiptap mark) {
  background-color: rgb(250 204 21);
  color: black;
  border-radius: 0.125rem;
  padding: 0 0.125rem;
}

.tiptap-editor :deep(.tiptap table) {
  border-collapse: collapse;
  margin: 1rem 0;
  overflow: hidden;
  table-layout: fixed;
  width: 100%;
}

.tiptap-editor :deep(.tiptap table td),
.tiptap-editor :deep(.tiptap table th) {
  border: 1px solid rgb(71 85 105);
  box-sizing: border-box;
  min-width: 1em;
  padding: 0.5rem;
  position: relative;
  vertical-align: top;
}

.tiptap-editor :deep(.tiptap table th) {
  background-color: rgb(51 65 85);
  font-weight: bold;
  text-align: left;
}

.tiptap-editor :deep(.tiptap table .selectedCell::after) {
  background: rgba(59, 130, 246, 0.3);
  content: "";
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  position: absolute;
  z-index: 2;
}

.tiptap-editor :deep(.tiptap table .column-resize-handle) {
  background-color: rgb(59 130 246);
  bottom: -2px;
  pointer-events: none;
  position: absolute;
  right: -2px;
  top: 0;
  width: 4px;
}

.tiptap-editor :deep(.tiptap div[data-youtube-video]) {
  cursor: move;
}

.tiptap-editor :deep(.tiptap div[data-youtube-video] iframe) {
  border: 0;
  border-radius: 0.375rem;
  display: block;
  max-width: 100%;
}

/* Syntax highlighting */
.tiptap-editor :deep(.tiptap .hljs-comment),
.tiptap-editor :deep(.tiptap .hljs-quote) {
  color: #616161;
}

.tiptap-editor :deep(.tiptap .hljs-variable),
.tiptap-editor :deep(.tiptap .hljs-template-variable),
.tiptap-editor :deep(.tiptap .hljs-attribute),
.tiptap-editor :deep(.tiptap .hljs-tag),
.tiptap-editor :deep(.tiptap .hljs-regexp),
.tiptap-editor :deep(.tiptap .hljs-link),
.tiptap-editor :deep(.tiptap .hljs-selector-id),
.tiptap-editor :deep(.tiptap .hljs-selector-class) {
  color: #f98181;
}

.tiptap-editor :deep(.tiptap .hljs-number),
.tiptap-editor :deep(.tiptap .hljs-meta),
.tiptap-editor :deep(.tiptap .hljs-built_in),
.tiptap-editor :deep(.tiptap .hljs-builtin-name),
.tiptap-editor :deep(.tiptap .hljs-literal),
.tiptap-editor :deep(.tiptap .hljs-type),
.tiptap-editor :deep(.tiptap .hljs-params) {
  color: #fbbc88;
}

.tiptap-editor :deep(.tiptap .hljs-string),
.tiptap-editor :deep(.tiptap .hljs-symbol),
.tiptap-editor :deep(.tiptap .hljs-bullet) {
  color: #b9f18d;
}

.tiptap-editor :deep(.tiptap .hljs-title),
.tiptap-editor :deep(.tiptap .hljs-section) {
  color: #faf594;
}

.tiptap-editor :deep(.tiptap .hljs-keyword),
.tiptap-editor :deep(.tiptap .hljs-selector-tag) {
  color: #70cff8;
}

.tiptap-editor :deep(.tiptap .hljs-name) {
  color: #f98181;
}

/* Modal de recursos incompatíveis */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}

.modal-content {
  background-color: rgb(30 41 59);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.75rem;
  max-width: 480px;
  width: 100%;
  padding: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.incompatible-modal .modal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.incompatible-modal .warning-icon {
  width: 28px;
  height: 28px;
  color: rgb(251 191 36);
  flex-shrink: 0;
}

.incompatible-modal .modal-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.incompatible-modal .modal-description {
  color: rgb(148 163 184);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.incompatible-modal .features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
  background-color: rgb(51 65 85);
  border-radius: 0.5rem;
  overflow: hidden;
}

.incompatible-modal .features-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(71 85 105);
}

.incompatible-modal .features-list li:last-child {
  border-bottom: none;
}

.incompatible-modal .feature-name {
  color: rgb(248 113 113);
  font-size: 0.875rem;
  font-weight: 500;
}

.incompatible-modal .feature-count {
  color: rgb(148 163 184);
  font-size: 0.75rem;
}

.incompatible-modal .modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.incompatible-modal .btn-cancel {
  padding: 0.625rem 1rem;
  background-color: rgb(51 65 85);
  color: rgb(203 213 225);
  border: 1px solid rgb(71 85 105);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.incompatible-modal .btn-cancel:hover {
  background-color: rgb(71 85 105);
  color: white;
}

.incompatible-modal .btn-confirm {
  padding: 0.625rem 1rem;
  background-color: rgb(220 38 38);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.incompatible-modal .btn-confirm:hover {
  background-color: rgb(185 28 28);
}

/* Transição do modal */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>

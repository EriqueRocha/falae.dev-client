import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImageNodeView from '~/components/ResizableImageNodeView.vue'

export interface ResizableImageOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number }) => ReturnType
    }
  }
}

export const ResizableImageExtension = Node.create<ResizableImageOptions>({
  name: 'image',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: 100,
        parseHTML: element => {
          const dataWidth = element.getAttribute('data-width')
          if (dataWidth) {
            return parseInt(dataWidth, 10)
          }
          const style = element.getAttribute('style') || ''
          const widthMatch = style.match(/width:\s*(\d+)%/)
          if (widthMatch) {
            return parseInt(widthMatch[1], 10)
          }
          return 100
        },
        renderHTML: attributes => {
          return {
            'data-width': attributes.width,
            style: `width: ${attributes.width}%; max-width: 100%;`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImageNodeView)
  },

  addCommands() {
    return {
      setImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },
})

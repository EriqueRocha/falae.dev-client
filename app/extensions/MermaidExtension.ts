import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MermaidNodeView from '~/components/MermaidNodeView.vue'

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaid: (content: string) => ReturnType
    }
  }
}

export const MermaidExtension = Node.create<MermaidOptions>({
  name: 'mermaid',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'mermaid-node',
      },
    }
  },

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-mermaid') || element.textContent || '',
        renderHTML: attributes => ({
          'data-mermaid': attributes.content,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
      {
        tag: 'div[data-mermaid]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-type': 'mermaid',
          'data-mermaid': node.attrs.content
        }
      ),
      node.attrs.content,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(MermaidNodeView)
  },

  addCommands() {
    return {
      insertMermaid:
        (content: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { content },
          })
        },
    }
  },
})

export default MermaidExtension

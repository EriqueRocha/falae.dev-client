import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import LatexNodeView from '~/components/LatexNodeView.vue'

export interface LatexOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    latex: {
      insertLatex: (content: string) => ReturnType
    }
  }
}

export const LatexExtension = Node.create<LatexOptions>({
  name: 'latex',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'latex-node',
      },
    }
  },

  addAttributes() {
    return {
      content: {
        default: '',
        parseHTML: element => element.getAttribute('data-latex') || element.textContent || '',
        renderHTML: attributes => ({
          'data-latex': attributes.content,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="latex"]',
      },
      {
        tag: 'span[data-latex]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-type': 'latex',
          'data-latex': node.attrs.content
        }
      ),
      node.attrs.content,
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(LatexNodeView)
  },

  addCommands() {
    return {
      insertLatex:
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

export default LatexExtension

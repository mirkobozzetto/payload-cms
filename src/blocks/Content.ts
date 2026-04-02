import type { Block } from 'payload'

// Content block: free-form rich text using Lexical editor
// Used for body text, legal pages, or any unstructured content
export const Content: Block = {
  slug: 'content',
  labels: {
    singular: 'Content',
    plural: 'Contents',
  },
  fields: [
    {
      name: 'richText',
      type: 'richText',
      required: true,
      localized: true,
    },
  ],
}

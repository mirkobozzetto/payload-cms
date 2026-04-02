import type { Block } from 'payload'

// HowItWorks block: numbered process steps with icon, title, description
// Maps to the jardinmusical landing page "how it works" section
// The `array` field type stores an ordered list of sub-objects
export const HowItWorks: Block = {
  slug: 'howItWorks',
  labels: {
    singular: 'How It Works',
    plural: 'How It Works',
  },
  fields: [
    {
      name: 'steps',
      type: 'array',
      required: true,
      fields: [
        {
          name: 'icon',
          type: 'text',
          admin: {
            description: 'Icon name or emoji for this step',
          },
        },
        {
          name: 'title',
          type: 'text',
          required: true,
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          localized: true,
        },
      ],
    },
  ],
}

import type { Block } from 'payload'

// TargetAudience block: grid of audience profiles with image and description
// Maps to the jardinmusical "target audience" landing section
export const TargetAudience: Block = {
  slug: 'targetAudience',
  labels: {
    singular: 'Target Audience',
    plural: 'Target Audiences',
  },
  fields: [
    {
      name: 'profiles',
      type: 'array',
      required: true,
      fields: [
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
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}

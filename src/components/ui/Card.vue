<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border',
        ghost: 'border-transparent bg-transparent',
        outline: 'border-border bg-transparent',
      },
      hover: {
        true: 'hover:border-primary/50 hover:bg-card/80 cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      hover: false,
    },
  }
)

type CardVariants = VariantProps<typeof cardVariants>

interface Props {
  variant?: CardVariants['variant']
  hover?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  hover: false,
})

const cardClass = computed(() =>
  cardVariants({ variant: props.variant, hover: props.hover })
)
</script>

<template>
  <div :class="[cardClass, props.class]">
    <slot />
  </div>
</template>

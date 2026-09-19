const HUES = ['primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const

// accent/info/success/warning/error are light, bright theme colors -- meant to be
// a *background* with their paired dark "-content" color on top, not used bare as
// foreground text on a white page (too washed out to read). primary/secondary are
// already dark enough at their base value to read fine as plain text.
const READABLE_TEXT_VARIANT: Record<(typeof HUES)[number], string> = {
  primary: 'primary',
  secondary: 'secondary',
  accent: 'accent-content',
  info: 'info-content',
  success: 'success-content',
  warning: 'warning-content',
  error: 'error-content',
}

function hueFor(tag: string): (typeof HUES)[number] {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0
  return HUES[Math.abs(hash) % HUES.length]
}

/** Deterministic: the same tag always gets the same color, spread across the palette. For badge/pill chips. */
export function tagColorClass(tag: string): string {
  return `badge-${hueFor(tag)}`
}

/** Same hash as tagColorClass, for plain colored text (e.g. the Tags-tab cloud) rather than a pill background.
 *  Uses whichever of the hue's two theme colors reads legibly on a light page background. */
export function tagTextColorClass(tag: string): string {
  return `text-${READABLE_TEXT_VARIANT[hueFor(tag)]}`
}

/** Same hash as tagColorClass, for a dashed-border pill outline. */
export function tagBorderColorClass(tag: string): string {
  return `border-${READABLE_TEXT_VARIANT[hueFor(tag)]}`
}

/** Same hash as tagColorClass, for a light background tint behind a dashed-border pill. */
export function tagBgTintClass(tag: string): string {
  return `bg-${hueFor(tag)}/20`
}

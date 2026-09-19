import { tagBgTintClass, tagBorderColorClass, tagTextColorClass } from '../lib/tag-color'

interface ChipProps extends React.HTMLAttributes<HTMLElement> {
  tag: string
  size?: 'xs' | 'sm'
  selected?: boolean
  onRemove?: () => void
}

export function Chip({ tag, size = 'sm', selected = true, onRemove, className = '', children, ...props }: ChipProps) {
  // Only onClick makes the chip itself a button -- onRemove already gets its own
  // nested <button>, and a <button> can't legally contain another <button>.
  const isButton = props.onClick !== undefined
  const Tag = isButton ? 'button' : 'span'
  const sizeClass = size === 'xs' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
  return (
    <Tag
      type={isButton ? 'button' : undefined}
      className={`inline-flex items-center gap-1 rounded-full border border-dashed ${sizeClass} ${tagBorderColorClass(tag)} ${tagTextColorClass(tag)} ${selected ? tagBgTintClass(tag) : 'bg-base-100'} ${isButton ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children ?? tag}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${tag}`}
          onClick={onRemove}
          className="cursor-pointer hover:opacity-70"
        >
          ×
        </button>
      )}
    </Tag>
  )
}

import { cn } from '../../lib/cn'

export function Avatar({
  src,
  alt,
  size = 'md',
  className,
}: {
  src: string
  alt: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeCls =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-10 w-10'
  return (
    <img
      src={src}
      alt={alt}
      className={cn('rounded-full bg-slate-200 object-cover', sizeCls, className)}
    />
  )
}

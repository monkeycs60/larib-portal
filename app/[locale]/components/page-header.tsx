import type { ReactNode } from 'react'

export function PageHeader({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="border-l-4 border-coral-500 pl-4">
      <h1 className="text-2xl md:text-3xl font-bold text-text-primary">{title}</h1>
      {subtitle ? <p className="text-text-secondary mt-1">{subtitle}</p> : null}
    </div>
  )
}

import { cn } from "@/lib/utils"
import { Link } from "@/app/i18n/navigation"
import { ReactNode } from "react"

type SidebarItem = {
  href: string
  label: string
  icon?: ReactNode
}

type SidebarProps = {
  items: SidebarItem[]
  activePath: string
  title?: string
}

export function Sidebar({ items, activePath, title }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r bg-[--sidebar] text-[--sidebar-foreground]">
      <div className="px-4 py-4 border-b border-[--sidebar-border]">
        <h2 className="text-lg font-semibold text-[--sidebar-foreground]">
          {title}
        </h2>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = activePath.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[--sidebar-accent] text-[--sidebar-accent-foreground]"
                      : "hover:bg-[--sidebar-accent] hover:text-[--sidebar-accent-foreground]"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}


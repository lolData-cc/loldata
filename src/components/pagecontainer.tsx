import { ReactNode } from "react"

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <div className="w-[100%] mx-auto">{children}</div>
  )
}

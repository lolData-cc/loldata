import * as React from "react"
import { cn } from "@/lib/utils"

type IconProps = React.SVGProps<SVGSVGElement> & {
  className?: string
  title?: string
}

export function RoleTopIcon({ className, title = "Top", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-label={title}
      role="img"
      {...props}
    >
      <g fill="currentColor" fillRule="nonzero">
        <path d="m19 3-4 4H7v8l-4 4V3z" />
        <path d="m5 21 4-4h8V9l4-4v16z" opacity="0.2" />
        <path d="M10 10h4v4h-4z" opacity="0.2" />
      </g>
    </svg>
  )
}

export function RoleJungleIcon({ className, title = "Jungle", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-label={title}
      role="img"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M5.14 2c1.58 1.21 5.58 5.023 6.976 9.953s0 10.047 0 10.047c-2.749-3.164-5.893-5.2-6.18-5.382l-.02-.013C5.45 13.814 3 8.79 3 8.79c3.536.867 4.93 4.279 4.93 4.279C7.558 8.698 5.14 2 5.14 2m14.976 5.907s-1.243 2.471-1.814 4.604c-.235.878-.285 2.2-.29 3.058v.282c.003.347.01.568.01.568s-1.738 2.397-3.38 3.678a27.5 27.5 0 0 0-.208-5.334c.928-2.023 2.846-5.454 5.682-6.856m-2.124-5.331s-2.325 3.052-2.836 6.029c-.11.636-.201 1.194-.284 1.695-.379.584-.73 1.166-1.05 1.733-.033-.125-.06-.25-.095-.375a21 21 0 0 0-1.16-3.08c.053-.146.103-.29.17-.438 0 0 1.814-3.78 5.255-5.564"
      />
    </svg>
  )
}

export function RoleMidIcon({ className, title = "Mid", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-label={title}
      role="img"
      {...props}
    >
      <g fill="currentColor" fillRule="nonzero">
        <path d="m15 3-4 4H7v4l-4 4V3zM9 21l4-4h4v-4l4-4v12z" opacity="0.2" />
        <path d="M18 3h3v3L6 21H3v-3z" />
      </g>
    </svg>
  )
}

export function RoleAdcIcon({ className, title = "ADC", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-label={title}
      role="img"
      {...props}
    >
      <g fill="currentColor" fillRule="nonzero">
        <path d="m19 3-4 4H7v8l-4 4V3z" opacity="0.2" />
        <path d="m5 21 4-4h8V9l4-4v16z" />
        <path d="M10 10h4v4h-4z" opacity="0.2" />
      </g>
    </svg>
  )
}

export function RoleSupportIcon({ className, title = "Support", ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      aria-label={title}
      role="img"
      {...props}
    >
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M12.833 10.833 14.5 17.53v.804L12.833 20h-1.666L9.5 18.333v-.804l1.667-6.696zM7 7.5 9.5 10l-1.667 4.167-2.5-2.5L6.167 10h-2.5L2 7.5zm15 0L20.333 10h-2.5l.834 1.667-2.5 2.5L14.5 10 17 7.5zM13.743 5l.757.833v.834l-1.667 2.5h-1.666L9.5 6.667v-.834L10.257 5z"
      />
    </svg>
  )
}

import * as React from "react";
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className" | "children"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  icon?: LucideIcon;
  label?: string;
  children?: React.ReactNode;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  (
    {
      className,
      activeClassName,
      pendingClassName,
      to,
      icon: Icon,
      label,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) =>
          cn(
            // Sensible default styling for sidebar navigation
            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            isPending && "opacity-70",
            isActive && activeClassName,
            isPending && pendingClassName,
            className,
          )
        }
        {...props}
      >
        {children ?? (
          <>
            {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
            {label ? <span className="truncate">{label}</span> : null}
          </>
        )}
      </RouterNavLink>
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
export default NavLink;

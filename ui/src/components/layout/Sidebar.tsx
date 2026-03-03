"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Layers,
  Settings,
  Clapperboard,
  CalendarDays,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSidebar } from "@/contexts/SidebarContext";
import { useThread } from "@/contexts/ThreadContext";

const links = [
  { href: "/", label: "New Thread", icon: MessageSquare },
  { href: "/search", label: "Search", icon: Search },
  { href: "/runs", label: "Spaces", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/creators", label: "Creators", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const notificationCount = useNotificationCount();
  const { collapsed, toggle } = useSidebar();
  const { newChat } = useThread();
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (!collapsed) return;
    setHoverExpanded(true);
  }, [collapsed]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverExpanded(false);
  }, []);

  // Visual state: show expanded width when not collapsed, or when hover-expanded
  const visualExpanded = !collapsed || hoverExpanded;

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "fixed top-3 left-3 bottom-3 bg-surface-1 border border-border rounded-xl shadow-elevation-2 flex flex-col z-40 transition-all duration-300 overflow-hidden",
        visualExpanded ? "w-56" : "w-16",
        // When hover-expanded (collapsed but hovering), float over content
        collapsed && hoverExpanded && "z-50 shadow-elevation-3"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        onClick={() => newChat()}
        className="flex items-center gap-2.5 px-5 py-5 border-b border-border rounded-t-xl min-h-[65px]"
      >
        <Clapperboard className="h-7 w-7 text-accent flex-shrink-0" />
        {visualExpanded && (
          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            Clip<span className="text-accent">Bot</span>
          </span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!visualExpanded ? label : undefined}
              onClick={href === "/" ? () => newChat() : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                !visualExpanded && "justify-center px-0",
                active
                  ? "bg-accent/12 text-accent border border-accent/15"
                  : "text-muted hover:text-foreground hover:bg-surface-2 border border-transparent"
              )}
            >
              <Icon className="h-4.5 w-4.5 flex-shrink-0" />
              {visualExpanded && (
                <>
                  <span className="whitespace-nowrap">{label}</span>
                  {label === "Creators" && notificationCount > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </>
              )}
              {!visualExpanded && label === "Creators" && notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Theme + Collapse + Footer */}
      <div className="border-t border-border p-3 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:text-foreground hover:bg-surface-2 transition-all duration-200 w-full cursor-pointer",
            !visualExpanded && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 flex-shrink-0" />
          ) : (
            <PanelLeftClose className="h-4 w-4 flex-shrink-0" />
          )}
          {visualExpanded && (collapsed ? "Expand" : "Collapse")}
        </button>

        <ThemeToggle compact={!visualExpanded} />

        {visualExpanded && (
          <div className="px-3 py-1 text-xs text-muted/60 whitespace-nowrap">
            ClipBot v0.2.0
          </div>
        )}
      </div>
    </aside>
  );
}

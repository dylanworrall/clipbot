"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Layers,
  Clapperboard,
  FileText,
  Film,
  CalendarDays,
  BarChart3,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { useSidebar } from "@/contexts/SidebarContext";
import { useThread } from "@/contexts/ThreadContext";

const links = [
  { href: "/", label: "New Thread", icon: MessageSquare },
  { href: "/search", label: "Search", icon: Search },
  { href: "/runs", label: "Spaces", icon: Layers },
  { href: "/editor", label: "Editor", icon: Film },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/creators", label: "Creators", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const notificationCount = useNotificationCount();
  const { collapsed, toggle } = useSidebar();
  const { newChat } = useThread();

  if (pathname === "/login") return null;
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
        "fixed top-3 left-3 bottom-3 bg-surface-1 border border-border rounded-2xl shadow-elevation-2 flex flex-col z-40 transition-all duration-300 overflow-hidden",
        visualExpanded ? "w-56" : "w-16",
        collapsed && hoverExpanded && "z-50"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        onClick={() => newChat()}
        className="flex items-center gap-3 px-4 h-14 border-b border-border"
      >
        <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
          <span className="text-accent font-bold text-sm">S</span>
        </div>
        {visualExpanded && (
          <span className="font-semibold text-foreground text-sm tracking-tight truncate">
            Socials
          </span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
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
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors relative group",
                !visualExpanded && "justify-center px-0",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground/80 hover:bg-surface-2/50"
              )}
            >
              <Icon className="size-[18px] flex-shrink-0" />
              {visualExpanded && (
                <>
                  <span className="whitespace-nowrap">{label}</span>
                  {label === "Creators" && notificationCount > 0 && (
                    <span className="ml-auto flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-[#FF453A] text-[10px] font-bold text-white leading-none">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </>
              )}
              {!visualExpanded && label === "Creators" && notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF453A] text-[8px] font-bold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile + Collapse */}
      <div className="border-t border-border p-2.5 space-y-0.5">
        <ProfileMenu compact={!visualExpanded} />

        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground/70 hover:bg-surface-2/50 transition-colors w-full cursor-pointer group",
            !visualExpanded && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <PanelLeftClose size={16} className="flex-shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
          {visualExpanded && (collapsed ? "Expand" : "Collapse")}
        </button>
      </div>
    </aside>
  );
}

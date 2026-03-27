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
  { href: "/drafts", label: "Drafts", icon: FileText },
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
        "fixed top-3 left-3 bottom-3 bg-[#1C1C1E]/95 backdrop-blur-2xl border border-white/10 ring-1 ring-white/5 rounded-2xl shadow-2xl flex flex-col z-40 transition-all duration-300 overflow-hidden",
        visualExpanded ? "w-56" : "w-16",
        collapsed && hoverExpanded && "z-50"
      )}
    >
      {/* Logo */}
      <Link
        href="/"
        onClick={() => newChat()}
        className="flex items-center gap-2.5 px-4 py-4 border-b border-white/5 min-h-[56px]"
      >
        <Clapperboard size={18} className="text-[#0A84FF] flex-shrink-0" />
        {visualExpanded && (
          <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap text-white/90">
            Socials
          </span>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2.5 mt-1">
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
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors relative group",
                !visualExpanded && "justify-center px-0",
                active
                  ? "bg-[#0A84FF]/10 text-[#0A84FF]"
                  : "text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 flex-shrink-0 transition-colors",
                active ? "text-[#0A84FF]" : "text-white/40 group-hover:text-white"
              )} />
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
      <div className="border-t border-white/5 p-2.5 space-y-0.5">
        <ProfileMenu compact={!visualExpanded} />

        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors w-full cursor-pointer group",
            !visualExpanded && "justify-center px-0"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} className="flex-shrink-0 text-white/40 group-hover:text-white transition-colors" />
          ) : (
            <PanelLeftClose size={16} className="flex-shrink-0 text-white/40 group-hover:text-white transition-colors" />
          )}
          {visualExpanded && (collapsed ? "Expand" : "Collapse")}
        </button>
      </div>
    </aside>
  );
}

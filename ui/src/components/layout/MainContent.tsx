"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <main
      className={cn(
        "min-h-screen bg-[#1C1C1E] text-white transition-[margin-left] duration-300",
        isLogin ? "ml-0" : collapsed ? "ml-22" : "ml-62"
      )}
    >
      {children}
    </main>
  );
}

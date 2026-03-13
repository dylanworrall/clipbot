"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  Sun,
  Moon,
  Settings,
  Globe,
  CreditCard,
  Cable,
  ChevronRight,
  Check,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
] as const;

interface ProfileMenuProps {
  compact?: boolean;
}

export function ProfileMenu({ compact }: ProfileMenuProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ bottom: 0, left: 0 });

  useEffect(() => setMounted(true), []);

  // Load saved language
  useEffect(() => {
    const saved = localStorage.getItem("clipbot-language");
    if (saved) setLanguage(saved);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setLangOpen(false);
      return;
    }
    updatePosition();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, updatePosition]);

  const isDark = mounted && theme === "dark";
  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const handleLangChange = (code: string) => {
    setLanguage(code);
    localStorage.setItem("clipbot-language", code);
    setLangOpen(false);
  };

  const menuItems = [
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? "Light mode" : "Dark mode",
      onClick: () => setTheme(isDark ? "light" : "dark"),
      shortcut: null,
    },
    {
      icon: Globe,
      label: currentLang.label,
      onClick: () => setLangOpen(!langOpen),
      chevron: true,
    },
    { type: "separator" as const },
    {
      icon: Settings,
      label: "Settings",
      onClick: () => { setOpen(false); router.push("/settings"); },
    },
    {
      icon: Cable,
      label: "Connectors",
      onClick: () => { setOpen(false); router.push("/settings?tab=connectors"); },
    },
    {
      icon: CreditCard,
      label: "Billing",
      onClick: () => { setOpen(false); router.push("/settings?tab=billing"); },
    },
    { type: "separator" as const },
    {
      icon: LogOut,
      label: "Sign out",
      onClick: () => { setOpen(false); signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } }); },
      danger: true,
    },
  ];

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150 w-full cursor-pointer group",
          "text-muted hover:text-foreground hover:bg-surface-2",
          compact && "justify-center px-0",
          open && "bg-surface-2 text-foreground"
        )}
      >
        <div className="h-5 w-5 rounded-full bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
          <User className="h-3 w-3" />
        </div>
        {!compact && <span className="truncate">Account</span>}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] flex gap-1"
            style={{
              bottom: pos.bottom,
              left: pos.left,
            }}
          >
            {/* Main menu */}
            <div className="w-52 bg-surface-1 border border-border rounded-xl shadow-elevation-3 overflow-hidden py-1.5">
              {menuItems.map((item, i) => {
                if ("type" in item && item.type === "separator") {
                  return <div key={i} className="h-px bg-border/50 my-1.5 mx-3" />;
                }
                const Icon = "icon" in item ? item.icon : Settings;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={"onClick" in item ? item.onClick : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer",
                      "danger" in item && item.danger
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-foreground hover:bg-surface-2"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted flex-shrink-0" />
                    <span className="flex-1">{"label" in item ? item.label : ""}</span>
                    {"chevron" in item && item.chevron && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted" />
                    )}
                  </button>
                );
              })}

              {/* Version */}
              <div className="px-3 pt-2 pb-1 text-[11px] text-muted/50 border-t border-border/30 mt-1.5">
                ClipBot v0.2.0
              </div>
            </div>

            {/* Language sub-menu */}
            {langOpen && (
              <div className="w-40 bg-surface-1 border border-border rounded-xl shadow-elevation-3 overflow-hidden py-1.5 self-end">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLangChange(lang.code)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors cursor-pointer",
                      language === lang.code
                        ? "text-accent bg-accent/8"
                        : "text-foreground hover:bg-surface-2"
                    )}
                  >
                    <span className="flex-1">{lang.label}</span>
                    {language === lang.code && (
                      <Check className="h-3.5 w-3.5 text-accent" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}

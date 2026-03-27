import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { SpaceProvider } from "@/contexts/SpaceContext";
import { ThreadProvider } from "@/contexts/ThreadContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConvexProvider } from "@/components/providers/ConvexProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Socials",
  description: "Automated viral clip pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1C1C1E] text-white`}
      >
        <ConvexProvider>
        <ThemeProvider>
          <ToastProvider>
            <TooltipProvider>
              <SidebarProvider>
                <SpaceProvider>
                  <ThreadProvider>
                    <Sidebar />
                    <MainContent>{children}</MainContent>
                  </ThreadProvider>
                </SpaceProvider>
              </SidebarProvider>
            </TooltipProvider>
          </ToastProvider>
        </ThemeProvider>
        </ConvexProvider>
      </body>
    </html>
  );
}

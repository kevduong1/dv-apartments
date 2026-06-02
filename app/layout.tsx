import type { Metadata, Viewport } from "next"
import { Geist_Mono, Nunito_Sans } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme-provider"
import { AppShell } from "@/components/app-shell"
import { EntityProvider } from "@/components/entity-context"
import { DbProvider } from "@/db/provider"
import { Toaster } from "@/components/ui/sonner"

const fontSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "DV Books — Series LLC bookkeeping",
  description:
    "Offline-first bookkeeping for a Series LLC property portfolio. Works without a connection and syncs when online.",
  applicationName: "DV Books",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DV Books",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body>
        <ThemeProvider>
          <DbProvider>
            <EntityProvider>
              <AppShell>{children}</AppShell>
            </EntityProvider>
          </DbProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}

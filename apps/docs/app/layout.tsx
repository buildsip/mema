import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { siteUrl } from "@/lib/shared";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tiramisu",
    template: "%s | Tiramisu",
  },
  description: "Git-native memory for AI coding agents.",
  icons: {
    icon: "/logo.ico",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(geist.variable, geistMono.variable, "font-sans")}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
        {process.env.NEXT_PUBLIC_ENV === "production" ? (
          <Script
            strategy="afterInteractive"
            src="https://cloud.umami.is/script.js"
            data-website-id="805e02f7-3da5-44db-91e6-a91081401370"
          />
        ) : null}
      </body>
    </html>
  );
}

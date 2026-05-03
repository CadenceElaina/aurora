import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme";
import { Nav } from "@/components/nav";
import { auth, isAuthConfigured } from "@/auth";

export const metadata: Metadata = {
  title: "Aurora",
  description: "Spaced repetition for technical interviews",
  openGraph: {
    title: "Aurora",
    description: "Spaced repetition for technical interviews. Never forget a LeetCode problem again.",
    siteName: "Aurora",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Aurora",
    description: "Spaced repetition for technical interviews. Never forget a LeetCode problem again.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let isAuthenticated = false;
  let isAdmin = false;
  let userName: string | undefined;
  let userEmail: string | undefined;
  let userImage: string | undefined;
  if (isAuthConfigured) {
    try {
      const session = await auth();
      isAuthenticated = !!session?.user?.id;
      userName = session?.user?.name ?? undefined;
      userEmail = session?.user?.email ?? undefined;
      userImage = session?.user?.image ?? undefined;
      isAdmin = !!(userEmail && process.env.ADMIN_EMAIL && userEmail === process.env.ADMIN_EMAIL);
    } catch {
      // Auth call failed — treat as unauthenticated
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      {/* Runs before body renders — reads saved pref or system preference to avoid flash */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=localStorage.getItem('aurora_theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s?s==='dark':d)document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();` }} />
      </head>
      <body className="min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
        <ThemeProvider>
          <Nav
            isAuthenticated={isAuthenticated}
            authConfigured={isAuthConfigured}
            isDemo={!isAuthenticated}
            isAdmin={isAdmin}
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
          />
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

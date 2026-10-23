import type { Metadata } from "next";
import "./globals.css";
import "./device-frame.css";

export const metadata: Metadata = {
  title: "Analytics Studio",
  description: "Edit your video analytics in a mobile studio with Supabase access-code protection.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="device-stage">
          <div className="device-screen">{children}</div>
        </div>
      </body>
    </html>
  );
}


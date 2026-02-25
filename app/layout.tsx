import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/use-auth";
import { ProfilesProvider } from "@/lib/hooks/use-profiles";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GSTR Pro — Indian GST Compliance Made Simple",
  description:
    "Automate your GSTR-1 filing. Upload Amazon & Flipkart sales reports, validate GST data, and generate portal-ready JSON & Excel files in minutes.",
  keywords: ["GST", "GSTR-1", "GST compliance", "Amazon seller", "Flipkart seller", "e-commerce GST"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <ProfilesProvider>
            {children}
          </ProfilesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

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
  title: "GSTDesk | Smart GST Filing for Sellers",
  description: "GSTDesk helps Indian e-commerce sellers automate GST compliance, reconcile returns, and export to Tally effortlessly.",
  keywords: ["GST", "GSTR-1", "GST compliance", "Amazon seller", "Flipkart seller", "e-commerce GST"],
  verification: {
    google: "googleff17a6ee2e56904d",
  },
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

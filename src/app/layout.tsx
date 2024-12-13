import type { Metadata } from "next";
import { UrbitIDProvider } from '@/cmp/UrbitIDProvider';
import localFont from "next/font/local";
import "./globals.css";

// TODO: Use "Urbit Sans" (or an approved app font) here
//
// const geistSans = localFont({
//   src: "./fonts/GeistVF.woff",
//   variable: "--font-geist-sans",
//   weight: "100 900",
// });
// const geistMono = localFont({
//   src: "./fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

export const metadata: Metadata = {
  title: '%slab',
  description: 'A tool for launching and maintaining portal digital organizations (PDOs).',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // FIXME: The specification of 'lang' has caused some hydration errors; should
  // it just be removed?
  return (
    <html lang="en-US">
      <body className="bg-black text-white antialiased">
        <UrbitIDProvider>
          {children}
        </UrbitIDProvider>
      </body>
    </html>
  );
}

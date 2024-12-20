import type { Metadata } from "next";
import Link from "next/link";
import { AppWrapper } from '@/comp/AppWrapper';
import "./globals.css";
import "./fonts.css";

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadata-fields
export const metadata: Metadata = {
  title: '%slab',
  description: "A tool for launching and maintaining portal digital organizations (PDOs).",
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
      <body className="bg-black relative text-white font-sans antialiased">
        <div className="absolute top-4 left-4">
          <Link href="/" className="button-lg">
            HOME
          </Link>
        </div>
        <div className="max-w-3xl mx-auto">
          <AppWrapper>
            {children}
          </AppWrapper>
        </div>
      </body>
    </html>
  );
}

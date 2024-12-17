import type { Metadata } from "next";
import { AppWrapper } from '@/comp/AppWrapper';
import "./globals.css";
import "./fonts.css";

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadata-fields
export const metadata: Metadata = {
  title: '%slab',
  // title: {
  //   default: "%slab",
  //   template: "%slab - %s"
  // },
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
      <body className="bg-black text-white font-sans antialiased">
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  );
}

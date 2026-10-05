import type { Metadata, Viewport } from "next";
import { Inter_Tight, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FollowUpOS — Know what happens next with every customer",
  description:
    "FollowUpOS turns scattered customer conversations into a prioritized list of opportunities and actions: who needs attention, why, what to say and what to do next.",
};

export const viewport: Viewport = {
  themeColor: "#0e1b17",
};

// Opt into reveal animations before first paint; without JS everything stays visible.
const motionScript = `document.documentElement.classList.add('motion-ready')`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${interTight.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

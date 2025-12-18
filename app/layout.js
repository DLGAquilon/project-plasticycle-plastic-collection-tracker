import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import Inter
import { Inter } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define Inter with a variable
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "PlastiCycle",
  description: "Track plastic waste and compete for the planet.",
};

export default function RootLayout({ children }) {
  // Apply all font variables globally to the body.
  // NOTE: This setup assumes you configure your tailwind.config.js to map:
  // - 'font-sans' to 'var(--font-geist-sans)' (for paragraphs)
  // - 'font-inter' to 'var(--font-inter)' (for headers)
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
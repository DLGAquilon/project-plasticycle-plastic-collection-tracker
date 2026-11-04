import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PlastiCycle",
  description: "Competitions for barangays, campuses, and companies collecting single-use plastic by the kilogram.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${jakarta.className} antialiased`}>{children}</body>
    </html>
  );
}

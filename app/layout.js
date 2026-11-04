import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${jakarta.className} antialiased`}>
        <Script id="pc-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem('pc-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}`}
        </Script>
        {children}
      </body>
    </html>
  );
}

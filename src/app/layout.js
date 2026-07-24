import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata = {
  title: "Daily Weather",
  description: "Hourly weather for DE/MD/VA/WV corridor cities + Nashville area",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#080808",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}

import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata = {
  title: "Daily Weather",
  description: "Hourly weather for DE/MD/VA/WV corridor cities + Nashville area",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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

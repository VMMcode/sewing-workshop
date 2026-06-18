import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Швейный цех",
  description: "Система управления швейным цехом",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
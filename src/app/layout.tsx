import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mundo Academy — El sistema operativo del emprendedor",
  description:
    "La primera plataforma latinoamericana donde aprendes, construyes, monetizas, conectas con inversores y escalas — todo en un solo ecosistema.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={`${inter.variable} ${jakarta.variable}`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}

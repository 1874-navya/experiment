import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeScope — AI Code Summarizer",
  description: "Understand any codebase with structured AI-powered explanations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

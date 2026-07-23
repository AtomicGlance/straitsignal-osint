import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StraitSignal — Oil Futures Intelligence",
  description:
    "An explainable OSINT workbench combining tanker movements, WTI, U.S. gasoline prices, 2026 election polling, and prediction-market priors.",
  keywords: [
    "oil futures",
    "tanker tracking",
    "AIS",
    "EIA",
    "gas prices",
    "election polls",
    "prediction markets",
    "data science",
    "OSINT",
  ],
  authors: [{ name: "Amirali Moradniaei" }],
  openGraph: {
    title: "StraitSignal — Oil Futures Intelligence",
    description:
      "Physical flows, consumer prices, political risk, and market priors in one auditable forecast.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1732,
        height: 908,
        alt: "StraitSignal oil futures intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StraitSignal — Oil Futures Intelligence",
    description:
      "Physical flows, consumer prices, political risk, and market priors in one auditable forecast.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

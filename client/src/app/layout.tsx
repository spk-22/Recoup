import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Recoup — Explainable Payment-Failure Recovery Agent',
  description: 'Razorpay Track 03: AI Revenue Recovery Agent with Cryptographic Hash-Chained Audit Trail',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0B0F17] text-slate-100 antialiased">{children}</body>
    </html>
  );
}

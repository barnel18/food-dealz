import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/nav';
import { PwaRegister } from '@/components/pwa-register';
import { publicEnv } from '@/lib/env';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.appUrl),
  title: {
    default: 'Food Dealz — every food deal in Madison, ranked by price',
    template: '%s · Food Dealz',
  },
  description:
    'Restaurant specials and grocery sale prices near you in Madison, WI, compared per slice, per pound, and per pint. Set a radius and find the cheapest option.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Food Dealz' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#e4572e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col pb-20 md:pb-0">
        <Nav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 sm:px-6">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-xs text-muted sm:px-6">
          Food Dealz · Madison, WI. Prices come from businesses’ own posts, sites, and ads and can change without notice. Business owner?{' '}
          <span className="text-foreground">Claim-your-listing tools are coming soon.</span>
        </footer>
        <PwaRegister />
      </body>
    </html>
  );
}

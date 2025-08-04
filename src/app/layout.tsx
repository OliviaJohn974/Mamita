import type {Metadata} from 'next';
import './globals.css';
import { AppHeader } from '@/components/layout/header';
import { AppFooter } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Gourmand Menu',
  description: 'Boulangerie, pâtisserie, et restauration à emporter.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-body antialiased min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-grow">
          {children}
        </main>
        <AppFooter />
        <Toaster />
      </body>
    </html>
  );
}

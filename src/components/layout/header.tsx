
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChefHat, LayoutDashboard, LogIn, LogOut, UserPlus, Utensils, Home } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import React from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        // We still use sessionStorage to quickly get role info without a DB call on every header render.
        // This is set on login.
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setIsAdmin(userData.role === 'admin');
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
        sessionStorage.removeItem('user');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    sessionStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    router.push('/');
  }

  const defaultLinks = [
    { href: '/', label: 'Accueil', icon: <Home className="mr-2 sm:hidden" /> },
    { href: '/menu', label: 'Menus', icon: <Utensils className="mr-2 sm:hidden" /> },
    { href: '/login', label: 'Se connecter', icon: <LogIn className="mr-2 sm:hidden" /> },
    { href: '/signup', label: 'S\'inscrire', icon: <UserPlus className="mr-2 sm:hidden" />, variant: 'default' },
  ];

  const authenticatedLinks = [
    { href: '/', label: 'Accueil', icon: <Home className="mr-2 sm:hidden" /> },
    { href: '/menu', label: 'Menus', icon: <Utensils className="mr-2 sm:hidden" /> },
    { href: '/dashboard', label: 'Mon Espace' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: <LayoutDashboard className="mr-2 sm:hidden" /> }] : []),
    { href: '#', label: 'Déconnexion', onClick: handleLogout, icon: <LogOut className="mr-2 sm:hidden" />, variant: 'ghost' },
  ];
  
  const navLinks = isAuthenticated ? authenticatedLinks : defaultLinks;

  return (
    <header className="bg-background/80 backdrop-blur-sm sticky top-0 z-40 border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-primary" />
          <span className="font-headline text-2xl font-bold">Le Mamita</span>
        </Link>
        <nav className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Button
                key={link.label}
                asChild={!link.onClick}
                variant={link.variant as any || 'ghost'}
                className={cn(
                  isActive && link.variant !== 'default' && 'bg-accent/50 text-accent-foreground'
                )}
                onClick={link.onClick}
              >
                {link.href ? (
                  <Link href={link.href}>
                    {link.icon}
                    <span className="hidden sm:inline-block">{link.label}</span>
                  </Link>
                ) : (
                  <>
                    {link.icon}
                    <span className="hidden sm:inline-block">{link.label}</span>
                  </>
                )}
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

    
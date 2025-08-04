
"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface GlobalSettings {
    facebookUrl?: string;
    instagramUrl?: string;
    contactUrl?: string;
}

export function AppFooter() {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<GlobalSettings>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global_settings');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as GlobalSettings);
        }
      } catch (error) {
        console.error("Error fetching global settings for footer:", error);
      }
    };
    fetchSettings();
  }, []);

  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            &copy; {currentYear} Gourmand Menu. Tous droits réservés.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            {settings.facebookUrl && (
              <Link href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Facebook
              </Link>
            )}
            {settings.instagramUrl && (
              <Link href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Instagram
              </Link>
            )}
            {settings.contactUrl && (
               <Link href={settings.contactUrl} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                 Contact
               </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

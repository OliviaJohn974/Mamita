
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { MapPin, Phone, UtensilsCrossed } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';

interface MenuSection {
    title: string;
    lines: string[];
    isVisible: boolean;
}

interface MenuData {
    id: string;
    image: string;
    date: string;
    horaires: string;
    sections: MenuSection[];
    footerLines: string[];
}

interface HomePageText {
    menus: MenuData[];
}

function MenuDisplay({ menuData }: { menuData: MenuData }) {
    if (!menuData) return null;

    const getIconForFooter = (line: string) => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('rue') || lowerLine.includes('avenue') || lowerLine.includes('saint-denis')) {
            return <MapPin className="h-4 w-4 mr-2.5 text-muted-foreground" />;
        }
        if (line.match(/\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}/)) {
            return <Phone className="h-4 w-4 mr-2.5 text-muted-foreground" />;
        }
        return null;
    }

    return (
        <Card className="w-full overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 flex flex-col bg-card">
            <CardContent className="p-6 md:p-8 flex-grow">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative h-24 w-24 mb-4">
                        <Image
                            src={menuData.image || 'https://placehold.co/100x100.png'}
                            alt="Logo ou image du menu"
                            fill
                            sizes="6rem"
                            className="rounded-full object-cover border-2 border-border"
                            data-ai-hint="food logo"
                        />
                    </div>
                    <div className='mb-6 min-h-[6rem] flex flex-col justify-center'>
                         <h3 className="font-headline text-lg font-semibold uppercase tracking-widest text-muted-foreground">Horaires</h3>
                         <p className="text-sm whitespace-pre-wrap">{menuData.horaires}</p>
                    </div>
                </div>

                <Separator className="mb-6" />

                <div className="grid grid-cols-1 gap-y-6">
                    {menuData.sections.map((section) => (
                         section.isVisible && (
                            <div key={section.title} className="text-center">
                                <h3 className="font-headline text-2xl tracking-wide mb-3">{section.title}</h3>
                                <ul className="space-y-1 text-muted-foreground">
                                    {section.lines.filter(line => line.trim() !== '').map((line, i) => <li key={i}>{line}</li>)}
                                </ul>
                            </div>
                         )
                    ))}
                </div>
            </CardContent>
            {menuData.footerLines && menuData.footerLines.some(line => line.trim() !== '') && (
                <div className="bg-muted/50 p-4 mt-auto">
                    <ul className="space-y-1.5 text-center text-sm">
                        {menuData.footerLines.filter(line => line.trim() !== '').map((line, i) => (
                            <li key={i} className="flex items-center justify-center">
                                {getIconForFooter(line)}
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    );
}

export default function MenuPage() {
  const [menusData, setMenusData] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchContent = async () => {
        setLoading(true);
        try {
            // Fetch homepage menu text content
            const textDocRef = doc(db, 'settings', "homepage_text");
            const textSnap = await getDoc(textDocRef);
            if (textSnap.exists()) {
                setMenusData((textSnap.data() as HomePageText).menus);
            }
        } catch (error) {
            console.error("Failed to fetch homepage content:", error);
        } finally {
            setLoading(false);
        }
    };
    
    fetchContent();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
        <section className="my-12">
            <h2 className="text-4xl font-headline font-bold text-center mb-10 flex items-center justify-center gap-4">
            <UtensilsCrossed className="h-8 w-8" />
            {menusData && menusData.length > 0 && menusData[0].date 
                ? `Menus du ${menusData[0].date}`
                : "Nos Menus du Jour"}
            </h2>
            {loading ? (
                <p className="text-center">Chargement des menus...</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                    {menusData && menusData.map(menu => (
                        <MenuDisplay
                            key={menu.id}
                            menuData={menu}
                        />
                    ))}
                </div>
            )}
        </section>
    </div>
  );
}

    
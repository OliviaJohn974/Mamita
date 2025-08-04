
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { Croissant, Soup, Cookie, CakeSlice, Pizza } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  image?: string;
}

const galleryCategories = [
    { id: 'viennoiseries', label: 'Viennoiseries', icon: Croissant },
    { id: 'petits_fours_sucres', label: 'P\'tits Fours Sucrés', icon: Cookie },
    { id: 'petits_fours_sales', label: 'P\'tits Fours Salés', icon: Soup },
    { id: 'pates_creoles', label: 'Pâtés Créoles', icon: CakeSlice },
    { id: 'mini_viennoiseries', label: 'Mini-Viennoiseries', icon: Pizza }
];


export default function AdminGalleryPage() {
    const { toast } = useToast();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "menuItems"), where("image", "!=", ""));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as MenuItem))
                .filter(item => item.image && item.image.trim() !== '');
            setMenuItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching menu items:", error);
            toast({ title: "Erreur", description: "Impossible de charger les images des produits.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const getItemsForCategory = (category: string) => {
        return menuItems.filter(item => item.category === category);
    };

    if (loading) {
        return <div>Chargement de la galerie...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-headline font-bold mb-2">Gestion de la Galerie Gourmande</h1>
            <p className="text-muted-foreground mb-6">
                Cette page affiche les produits qui ont une image et qui apparaîtront donc dans la galerie de la page d'accueil.
                Trois images aléatoires sont choisies pour chaque catégorie.
            </p>
            
             <Tabs defaultValue="viennoiseries" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-4xl mx-auto mb-8">
                    {galleryCategories.map(cat => {
                         const Icon = cat.icon;
                         return (
                            <TabsTrigger key={cat.id} value={cat.id}>
                                <Icon className="mr-2 h-5 w-5" />
                                {cat.label}
                            </TabsTrigger>
                         )
                    })}
                </TabsList>
                 {galleryCategories.map(cat => (
                    <TabsContent key={cat.id} value={cat.id}>
                        <Card>
                             <CardHeader>
                                <CardTitle>{cat.label}</CardTitle>
                                <CardDescription>
                                    Images provenant de la catégorie de produits `{cat.id.replace(/_/g, ' ')}`.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {getItemsForCategory(cat.id).length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {getItemsForCategory(cat.id).map(item => (
                                            <Card key={item.id} className="overflow-hidden">
                                                <div className="relative aspect-square">
                                                    <Image
                                                        src={item.image!}
                                                        alt={item.name}
                                                        fill
                                                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                                                        className="object-cover transition-transform duration-300 hover:scale-105"
                                                    />
                                                </div>
                                                <div className="p-2 text-center text-xs">
                                                    <p className="font-medium truncate">{item.name}</p>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">
                                        Aucun produit avec une image dans cette catégorie.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                 ))}
            </Tabs>
        </div>
    );
}

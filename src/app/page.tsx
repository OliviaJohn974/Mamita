<h1>Bienvenue dans l’espace admin (test déploiement)</h1>

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Croissant, Soup, Cookie, CakeSlice, Pizza } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Autoplay from "embla-carousel-autoplay"


interface HomePageSettings {
    title?: string;
    subtitle?: string;
    heroImage?: string;
}

interface MenuItem {
    id: string;
    name: string;
    category: string;
    image?: string;
}

const GalleryGrid = ({ category }: { category: string }) => {
    const [images, setImages] = useState<{ src: string; alt: string; hint: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "menuItems"), where("category", "==", category));
                const querySnapshot = await getDocs(q);
                const productImages = querySnapshot.docs
                    .map(doc => doc.data() as MenuItem)
                    .filter(item => item.image && item.image.trim() !== '')
                    .map(item => ({
                        src: item.image!,
                        alt: item.name,
                        hint: item.name.split(' ').slice(0, 2).join(' '),
                    }));

                setImages(productImages);

            } catch (error) {
                console.error(`Error fetching images for category ${category}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [category]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, index) => (
                    <Card key={index} className="overflow-hidden">
                        <div className="relative aspect-square bg-muted animate-pulse" />
                    </Card>
                ))}
            </div>
        );
    }
    
    if (images.length === 0) {
        return <p className="text-muted-foreground text-center py-8">Aucune image disponible pour cette catégorie.</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((item, index) => (
                <Card key={index} className="overflow-hidden group">
                    <div className="relative aspect-square">
                        <Image 
                            src={item.src} 
                            alt={item.alt} 
                            fill 
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw" 
                            className="object-cover transition-transform duration-300 group-hover:scale-110" 
                            data-ai-hint={item.hint} 
                        />
                        <div className="absolute bottom-0 right-0 bg-black/50 text-white p-2 text-xs font-semibold">
                            {item.alt}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default function Home() {
  const [carouselImages, setCarouselImages] = useState<string[]>([]);
  const [settings, setSettings] = useState<HomePageSettings>({
      title: 'Saveurs, accueil, tradition...',
      subtitle: 'Depuis plus de 30 ans nous vous proposons nos fabrications artisanales.\nLe pain et la viennoiserie, les gâteaux pour les petits plaisirs ou les grandes occasions, les petites pâtisseries sucrées et salées et bien sûr le traditionnel pâté créole…',
      heroImage: 'https://placehold.co/1200x600.png'
  });
  const [loading, setLoading] = useState(true);
  
    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true, stopOnLastSnap: false })
    );
  
  useEffect(() => {
    const fetchContent = async () => {
        setLoading(true);
        try {
            // Fetch carousel images
            const carouselDocRef = doc(db, 'settings', "homepage_carousel");
            const carouselSnap = await getDoc(carouselDocRef);
            if (carouselSnap.exists() && carouselSnap.data().images) {
                setCarouselImages(carouselSnap.data().images);
            } else {
                 setCarouselImages([
                    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1800",
                    "https://images.unsplash.com/photo-1567684014764-c69e1640e229?q=80&w=1800",
                    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1800",
                ]);
            }
            
            // Fetch homepage settings (title, subtitle, hero image)
            const settingsDocRef = doc(db, 'settings', "homepage_settings");
            const settingsSnap = await getDoc(settingsDocRef);
            if (settingsSnap.exists()) {
                setSettings(prev => ({...prev, ...settingsSnap.data()}));
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
    <div>
        <section className="mb-12">
            <Carousel
                className="w-full"
                opts={{
                    loop: true,
                }}
                plugins={[plugin.current]}
                onMouseEnter={plugin.current.stop}
                onMouseLeave={plugin.current.reset}
            >
            <CarouselContent>
                {carouselImages.map((src, index) => (
                    <CarouselItem key={index}>
                        <div className="relative h-64 md:h-[500px]">
                            <Image src={src} alt={`Bandeau d'accueil ${index + 1}`} fill sizes="100vw" className="object-cover" priority={index === 0} />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {carouselImages.length > 1 && (
                <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4"/>
                </>
            )}
            </Carousel>
      </section>

        <div className="container mx-auto px-4 py-8">
            <section className="text-center my-8">
                <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight">
                    {settings.title}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto whitespace-pre-wrap">
                    {settings.subtitle}
                </p>
            </section>
            
            <section className="my-16">
                 <div className="relative h-96 w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg">
                    <Image
                        src={settings.heroImage!}
                        alt="Photo de la boutique"
                        fill
                        sizes="(max-width: 1024px) 100vw, 66vw"
                        className="object-cover"
                        data-ai-hint="bakery interior"
                    />
                </div>
            </section>

            <section className="my-16">
                <h2 className="text-4xl font-headline font-bold text-center mb-10">
                Notre Galerie Gourmande
                </h2>
                <Tabs defaultValue="viennoiseries" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-4xl mx-auto mb-8">
                    <TabsTrigger value="viennoiseries"><Croissant className="mr-2 h-5 w-5" />Viennoiseries</TabsTrigger>
                    <TabsTrigger value="petits_fours_sucres"><Cookie className="mr-2 h-5 w-5" />P'tits Fours Sucrés</TabsTrigger>
                    <TabsTrigger value="petits_fours_sales"><Soup className="mr-2 h-5 w-5" />P'tits Fours Salés</TabsTrigger>
                    <TabsTrigger value="pates_creoles"><CakeSlice className="mr-2 h-5 w-5" />Pâtés Créoles</TabsTrigger>
                    <TabsTrigger value="mini_viennoiseries"><Pizza className="mr-2 h-5 w-5" />Mini-Viennoiseries</TabsTrigger>
                </TabsList>
                <TabsContent value="viennoiseries">
                    <GalleryGrid category="viennoiseries" />
                </TabsContent>
                <TabsContent value="petits_fours_sucres">
                    <GalleryGrid category="petits_fours_sucres" />
                </TabsContent>
                <TabsContent value="petits_fours_sales">
                    <GalleryGrid category="petits_fours_sales" />
                </TabsContent>
                <TabsContent value="pates_creoles">
                    <GalleryGrid category="pates_creoles" />
                </TabsContent>
                <TabsContent value="mini_viennoiseries">
                    <GalleryGrid category="mini_viennoiseries" />
                </TabsContent>
                </Tabs>
            </section>
        </div>
    </div>
  );
}

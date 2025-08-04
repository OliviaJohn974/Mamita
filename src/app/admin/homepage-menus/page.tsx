
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';

const HOMEPAGE_TEXT_DOC_ID = "homepage_text";

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

const storage = getStorage(app);

const createDefaultMenuData = (id: string): MenuData => ({
    id,
    image: `https://firebasestorage.googleapis.com/v0/b/le-mamita.appspot.com/o/site-assets%2Flogo_mamita.png?alt=media&token=c1f45344-7476-4076-a765-b778403a4365`,
    date: 'Mercredi 30 Juillet 2025',
    horaires: 'Du Lundi au Vendredi : de 7h à 14h',
    sections: [
        { title: 'Entrée', lines: Array(4).fill(''), isVisible: true },
        { title: 'Plat chaud', lines: Array(4).fill(''), isVisible: true },
        { title: 'Accompagnement', lines: Array(2).fill(''), isVisible: true },
        { title: 'Dessert', lines: Array(4).fill(''), isVisible: true },
        { title: 'Boisson', lines: Array(4).fill(''), isVisible: true },
    ],
    footerLines: Array(3).fill(''),
});

export default function AdminHomePageMenusPage() {
    const { toast } = useToast();
    const [menusData, setMenusData] = useState<MenuData[]>([createDefaultMenuData('menu_1'), createDefaultMenuData('menu_2')]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState<number | null>(null);

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', HOMEPAGE_TEXT_DOC_ID);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as HomePageText;
                if (data.menus && data.menus.length > 0) {
                     const fetchedMenus = data.menus.map(menu => ({
                        ...createDefaultMenuData(menu.id),
                        ...menu,
                    }));
                    setMenusData(fetchedMenus);
                }
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            toast({ title: "Erreur", description: "Impossible de charger les textes des menus.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);


    const handleInputChange = (menuIndex: number, sectionIndex: number, lineIndex: number, value: string) => {
        setMenusData(prevMenus => {
            const newMenus = [...prevMenus];
            newMenus[menuIndex].sections[sectionIndex].lines[lineIndex] = value;
            return newMenus;
        });
    };
    
    const handleSectionChange = (menuIndex: number, sectionIndex: number, field: 'title' | 'isVisible', value: string | boolean) => {
         setMenusData(prevMenus => {
            const newMenus = JSON.parse(JSON.stringify(prevMenus));
            if (newMenus[menuIndex] && newMenus[menuIndex].sections[sectionIndex]) {
              newMenus[menuIndex].sections[sectionIndex][field] = value;
            }
            return newMenus;
        });
    }

    const handleFieldChange = (menuIndex: number, field: 'date' | 'horaires', value: string) => {
        setMenusData(prevMenus => {
            const newMenus = JSON.parse(JSON.stringify(prevMenus));
            if (newMenus[menuIndex]) {
              newMenus[menuIndex][field] = value;
            }
            return newMenus;
        });
    }

    const handleImageChange = (menuIndex: number, value: string) => {
        setMenusData(prevMenus => {
            const newMenus = JSON.parse(JSON.stringify(prevMenus));
            if (newMenus[menuIndex]) {
              newMenus[menuIndex].image = value;
            }
            return newMenus;
        });
    };

    const handleFooterChange = (menuIndex: number, lineIndex: number, value: string) => {
         setMenusData(prevMenus => {
            const newMenus = [...prevMenus];
            newMenus[menuIndex].footerLines[lineIndex] = value;
            return newMenus;
        });
    };
    
    const handleMenuPaste = (menuIndex: number, rawText: string) => {
        setMenusData(prevMenus => {
            const newMenus = JSON.parse(JSON.stringify(prevMenus));
            const targetMenu = newMenus[menuIndex];
            if (!targetMenu) return newMenus;

            // Reset all current lines
            targetMenu.sections.forEach((section: MenuSection) => {
                section.lines = Array(section.lines.length).fill('');
            });
            
            const lines = rawText.split('\n').map(line => line.trim()).filter(line => line !== '');
            let currentSectionIndex = -1;

            lines.forEach(line => {
                const sectionTitle = line.trim().toLowerCase();
                const foundSectionIndex = targetMenu.sections.findIndex((s: MenuSection) => s.title.toLowerCase() === sectionTitle);

                if (foundSectionIndex !== -1) {
                    currentSectionIndex = foundSectionIndex;
                } else if (currentSectionIndex !== -1) {
                    const section = targetMenu.sections[currentSectionIndex];
                    const emptyLineIndex = section.lines.findIndex((l: string) => l === '');
                    if (emptyLineIndex !== -1) {
                        section.lines[emptyLineIndex] = line;
                    }
                }
            });
            
            toast({ title: "Menu analysé", description: `Le contenu du Menu #${menuIndex + 1} a été mis à jour.`});
            return newMenus;
        });
    };

    const handleImageUploadClick = (menuIndex: number) => {
        fileInputRefs.current[menuIndex]?.click();
    };

    const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, menuIndex: number) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(menuIndex);
        try {
            const storageRef = ref(storage, `homepage-banners/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            handleImageChange(menuIndex, downloadURL);
            toast({ title: "Image téléversée", description: "L'URL de l'image a été mise à jour." });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ title: "Erreur de téléversement", description: "Impossible de téléverser l'image.", variant: "destructive"});
        } finally {
            setIsUploading(null);
            if (fileInputRefs.current[menuIndex]) {
                fileInputRefs.current[menuIndex]!.value = "";
            }
        }
    };


    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, 'settings', HOMEPAGE_TEXT_DOC_ID);
            await setDoc(docRef, { menus: menusData });
            toast({ title: "Succès", description: "Contenu des menus des points de vente enregistré." });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div>Chargement du contenu des menus...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline font-bold">Gestion des Menus des Points de Vente</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Enregistrement..." : "Enregistrer le contenu"}
                </Button>
            </div>

            <Tabs defaultValue="menu_1">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="menu_1">Menu #1 (Mamita)</TabsTrigger>
                    <TabsTrigger value="menu_2">Menu #2 (Boutique Café)</TabsTrigger>
                </TabsList>
                 {menusData.map((menu, menuIndex) => (
                    <TabsContent key={menu.id} value={menu.id}>
                       <Card>
                            <CardHeader>
                                <CardTitle>Personnalisation du Menu #{menuIndex + 1}</CardTitle>
                                <CardDescription>Modifiez ici le contenu qui sera affiché sur la page des menus.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label htmlFor={`date-${menuIndex}`}>Date du menu</Label>
                                    <Input
                                        id={`date-${menuIndex}`}
                                        value={menu.date}
                                        onChange={(e) => handleFieldChange(menuIndex, 'date', e.target.value)}
                                        placeholder="Ex: Mercredi 30 Juillet 2025"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`horaires-${menuIndex}`}>Texte des horaires</Label>
                                    <Textarea
                                        id={`horaires-${menuIndex}`}
                                        value={menu.horaires}
                                        onChange={(e) => handleFieldChange(menuIndex, 'horaires', e.target.value)}
                                        placeholder="Ex: Du Lundi au Vendredi : de 7h à 14h"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor={`image-url-${menuIndex}`}>URL de l'image de bandeau/logo</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`image-url-${menuIndex}`}
                                            value={menu.image}
                                            onChange={(e) => handleImageChange(menuIndex, e.target.value)}
                                            placeholder="https://... ou téléversez une image"
                                        />
                                        <input
                                            type="file"
                                            ref={el => fileInputRefs.current[menuIndex] = el}
                                            onChange={(e) => handleImageFileUpload(e, menuIndex)}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleImageUploadClick(menuIndex)}
                                            disabled={isUploading === menuIndex}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            {isUploading === menuIndex ? "Chargement..." : "Uploader"}
                                        </Button>
                                    </div>
                                </div>
                                <Separator />
                                {menu.sections.map((section, sectionIndex) => (
                                    <div key={sectionIndex} className="space-y-2">
                                        <div className="flex items-center gap-4">
                                             <Checkbox
                                                id={`visible-${menuIndex}-${sectionIndex}`}
                                                checked={section.isVisible}
                                                onCheckedChange={(checked) => handleSectionChange(menuIndex, sectionIndex, 'isVisible', !!checked)}
                                            />
                                            <Input
                                                value={section.title}
                                                onChange={(e) => handleSectionChange(menuIndex, sectionIndex, 'title', e.target.value)}
                                                className="font-semibold text-lg"
                                            />
                                        </div>
                                        {section.lines.map((line, lineIndex) => (
                                            <Input
                                                key={lineIndex}
                                                value={line}
                                                onChange={(e) => handleInputChange(menuIndex, sectionIndex, lineIndex, e.target.value)}
                                                placeholder={`${section.title} - Ligne ${lineIndex + 1}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                                <Separator />
                                <div>
                                    <h3 className="font-semibold">Lignes de bas de page</h3>
                                    {menu.footerLines.map((line, lineIndex) => (
                                        <Input
                                            key={lineIndex}
                                            value={line}
                                            onChange={(e) => handleFooterChange(menuIndex, lineIndex, e.target.value)}
                                            placeholder={`Ligne de bas de page ${lineIndex + 1}`}
                                            className="mt-2"
                                        />
                                    ))}
                                </div>
                                
                                <Separator />
                                
                                <div>
                                    <h3 className="font-semibold">Coller le menu complet ici pour un remplissage automatique</h3>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Assurez-vous que les titres de section (Entrée, Plat chaud, etc.) correspondent exactement.
                                    </p>
                                    <Textarea
                                        placeholder="Collez le texte de votre menu ici..."
                                        className="h-48"
                                        onChange={(e) => handleMenuPaste(menuIndex, e.target.value)}
                                    />
                                </div>

                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );

}

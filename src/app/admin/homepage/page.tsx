
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { Upload } from 'lucide-react';

const HOMEPAGE_SETTINGS_DOC_ID = "homepage_settings";

interface HomePageSettings {
    title?: string;
    subtitle?: string;
    heroImage?: string;
}

const storage = getStorage(app);

export default function AdminHomepagePage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<HomePageSettings>({
        title: '',
        subtitle: '',
        heroImage: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, 'settings', HOMEPAGE_SETTINGS_DOC_ID);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSettings(docSnap.data() as HomePageSettings);
                }
            } catch (error) {
                console.error("Error fetching homepage settings:", error);
                toast({ title: "Erreur", description: "Impossible de charger les paramètres de la page d'accueil.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [toast]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setSettings(prev => ({ ...prev, [id]: value }));
    };

    const handleImageUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `homepage/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setSettings(prev => ({ ...prev, heroImage: downloadURL }));
            toast({ title: "Image téléversée", description: "L'URL de l'image a été mise à jour. N'oubliez pas d'enregistrer." });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ title: "Erreur de téléversement", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, 'settings', HOMEPAGE_SETTINGS_DOC_ID);
            await setDoc(docRef, settings, { merge: true });
            toast({ title: "Succès", description: "Les informations de la page d'accueil ont été enregistrées." });
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({ title: "Erreur", description: "Impossible d'enregistrer les informations.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div>Chargement des paramètres...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline font-bold">Gestion de la Page d'Accueil</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
            </div>
            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Contenu Textuel</CardTitle>
                    <CardDescription>Modifiez le titre et le texte d'introduction de la page d'accueil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Titre principal</Label>
                        <Input id="title" value={settings.title} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subtitle">Texte d'introduction</Label>
                        <Textarea id="subtitle" value={settings.subtitle} onChange={handleInputChange} rows={5} />
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-3xl mt-8">
                <CardHeader>
                    <CardTitle>Image de la boutique</CardTitle>
                    <CardDescription>Changez la photo principale affichée sur la page d'accueil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="heroImage">URL de l'image</Label>
                        <div className="flex gap-2">
                            <Input id="heroImage" value={settings.heroImage} onChange={handleInputChange} />
                            <input type="file" ref={fileInputRef} onChange={handleImageFileUpload} accept="image/*" className="hidden" />
                            <Button variant="outline" onClick={handleImageUploadClick} disabled={isUploading}>
                                <Upload className="mr-2 h-4 w-4" />
                                {isUploading ? 'Chargement...' : 'Téléverser'}
                            </Button>
                        </div>
                    </div>
                    {settings.heroImage && (
                        <div>
                            <p className="text-sm font-medium mb-2">Aperçu :</p>
                            <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                                <Image src={settings.heroImage} alt="Aperçu" fill className="object-cover" />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

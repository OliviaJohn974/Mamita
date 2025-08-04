"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const CAROUSEL_SETTINGS_DOC_ID = "homepage_carousel";

interface CarouselImage {
    id: string; 
    url: string;
}

const storage = getStorage(app);

export default function AdminHomepageCarouselEditPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [images, setImages] = useState<CarouselImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchImages = useCallback(async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'settings', CAROUSEL_SETTINGS_DOC_ID);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().images) {
                const imageUrls = docSnap.data().images as string[];
                setImages(imageUrls.map((url) => ({ id: url, url })));
            }
        } catch (error) {
            console.error("Error fetching images:", error);
            toast({ title: "Erreur", description: "Impossible de charger les images.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchImages();
    }, [fetchImages]);
    
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const currentDocRef = doc(db, 'settings', CAROUSEL_SETTINGS_DOC_ID);
            const currentDocSnap = await getDoc(currentDocRef);
            const currentImages = currentDocSnap.exists() ? currentDocSnap.data().images as string[] : [];
            
            const storageRef = ref(storage, `homepage-carousel/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            const newImageUrls = [...currentImages, downloadURL];

            await setDoc(currentDocRef, { images: newImageUrls }, { merge: true }); 
            setImages(newImageUrls.map(url => ({ id: url, url })));
            toast({ title: "Image téléversée", description: "L'image a été ajoutée au bandeau." });

        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ title: "Erreur de téléversement", description: "Impossible de téléverser l'image.", variant: "destructive"});
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };
    
    const handleDeleteImage = async (imageUrl: string) => {
        setIsDeleting(imageUrl);
        try {
            // Delete from Storage
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef).catch(error => {
                if (error.code !== 'storage/object-not-found') throw error;
                console.warn("Image not found in storage, but will be removed from database.");
            });
            
            // Delete from Firestore
            const newImages = images.filter(img => img.url !== imageUrl);
            const newImageUrls = newImages.map(img => img.url);
            const docRef = doc(db, 'settings', CAROUSEL_SETTINGS_DOC_ID);
            await setDoc(docRef, { images: newImageUrls });
            
            setImages(newImages);
            toast({ title: "Image supprimée", description: "L'image a été retirée du bandeau." });

        } catch (error) {
             console.error("Error deleting image:", error);
             toast({ title: "Erreur", description: "Impossible de supprimer l'image.", variant: "destructive" });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div>
             <Button variant="ghost" onClick={() => router.push('/admin/homepage-carousel')} className="mb-6">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour au tri des images
            </Button>
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline font-bold">Ajouter ou Supprimer des Images</h1>
                 <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                 <Button variant="outline" onClick={handleUploadClick} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? "Chargement..." : "Ajouter une image"}
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Images actuelles ({images.length})</CardTitle>
                    <CardDescription>
                       Cliquez sur l'icône poubelle pour supprimer une image du bandeau. La suppression est définitive.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Chargement des images...</p>
                    ) : (
                         <div className="space-y-4">
                            {images.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {images.map(image => (
                                    <div key={image.id} className="relative group aspect-square rounded-md overflow-hidden">
                                        <Image src={image.url} alt="Bandeau" fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16.6vw" className="object-cover" />
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-1 right-1 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    disabled={isDeleting === image.url}
                                                >
                                                    {isDeleting === image.url ? <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Cette action supprimera l'image du bandeau et du stockage. Cette action est irréversible.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteImage(image.url)}>
                                                    Oui, supprimer
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">Aucune image dans le bandeau pour le moment. Ajoutez-en une pour commencer.</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

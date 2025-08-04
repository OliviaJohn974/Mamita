"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, deleteObject } from "firebase/storage";
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from 'next/image';
import { GripVertical, Trash2, Plus, AlertTriangle, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const CAROUSEL_SETTINGS_DOC_ID = "homepage_carousel";

interface CarouselImage {
    id: string; 
    url: string;
}

const storage = getStorage(app);

const SortableImageItem = ({ image }: { image: CarouselImage }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-md overflow-hidden border">
             <button {...attributes} {...listeners} className="absolute top-1 left-1 z-10 p-1 bg-background/50 rounded-full text-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
            </button>
            <Image src={image.url} alt="Bandeau" fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 16.6vw" className="object-cover" />
        </div>
    );
};

export default function AdminHomepageCarouselPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [images, setImages] = useState<CarouselImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchImages = useCallback(() => {
        setLoading(true);
        const docRef = doc(db, 'settings', CAROUSEL_SETTINGS_DOC_ID);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().images) {
                const imageUrls = docSnap.data().images as string[];
                setImages(imageUrls.map((url) => ({ id: url, url })));
            } else {
                setImages([]);
            }
            setLoading(false);
        }, (error) => {
             console.error("Error fetching images:", error);
             toast({ title: "Erreur", description: "Impossible de charger les images du bandeau.", variant: "destructive" });
             setLoading(false);
        });
        return unsubscribe;
    }, [toast]);

    useEffect(() => {
        const unsubscribe = fetchImages();
        return () => unsubscribe();
    }, [fetchImages]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setImages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over!.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    
    const handleSaveOrder = async () => {
        setIsSaving(true);
        try {
            const docRef = doc(db, 'settings', CAROUSEL_SETTINGS_DOC_ID);
            const newImageUrls = images.map(img => img.url);
            await setDoc(docRef, { images: newImageUrls });
            toast({ title: "Ordre enregistré !", description: "Le nouvel ordre des images a été sauvegardé."});
        } catch (error) {
            console.error("Error saving order:", error);
            toast({ title: "Erreur", description: "Impossible d'enregistrer le nouvel ordre.", variant: "destructive"});
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-headline font-bold">Ordre du Bandeau d'Accueil</h1>
                    <p className="text-muted-foreground">Glissez-déposez les images pour les réorganiser.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/admin/homepage-carousel/edit')}>
                        <Edit className="mr-2 h-4 w-4" />
                        Ajouter / Supprimer
                    </Button>
                    <Button onClick={handleSaveOrder} disabled={isSaving}>
                        {isSaving ? "Enregistrement..." : "Enregistrer l'ordre"}
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Images ({images.length})</CardTitle>
                    <CardDescription>
                        Cliquez et maintenez sur l'icône de prise pour déplacer une image.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p>Chargement des images...</p>
                    ) : (
                        images.length > 0 ? (
                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={images} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {images.map(image => (
                                            <SortableImageItem key={image.id} image={image} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                             <p className="text-muted-foreground text-center py-8">Aucune image dans le bandeau. <Button variant="link" className="p-0" onClick={() => router.push('/admin/homepage-carousel/edit')}>Ajoutez-en une.</Button></p>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

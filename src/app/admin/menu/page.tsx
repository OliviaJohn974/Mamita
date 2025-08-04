
"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowUpDown } from 'lucide-react';
import * as XLSX from 'xlsx';


interface MenuItem {
  id: string;
  reference: string;
  name: string;
  category: string;
  price: number;
  description: string;
  image?: string;
  availabilityTime?: string;
}

type SortableKeys = 'reference' | 'name' | 'category' | 'price';

const storage = getStorage(app);

export default function AdminMenuPage() {
  const { toast } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending'});


  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "menuItems"), (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
      setMenuItems(items);

      const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);

      setLoading(false);
    }, (error) => {
      console.error("Error fetching menu items:", error);
      toast({ title: "Erreur", description: "Impossible de charger les plats.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const sortedMenuItems = useMemo(() => {
    let sortableItems = [...menuItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [menuItems, sortConfig]);
  
  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />; // Icons could be differentiated later (ArrowUp/ArrowDown)
  };


  const handleOpenDialog = (item: Partial<MenuItem> | null = null) => {
    setCurrentItem(item || { reference: '', name: '', category: '', price: 0, description: '', image: '', availabilityTime: '' });
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentItem(null);
  }

  const handleSave = async () => {
    if (!currentItem || !currentItem.reference || !currentItem.name || !currentItem.category || currentItem.price === undefined) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires (Référence, Nom, Catégorie, Prix).", variant: "destructive" });
      return;
    }

    try {
      if (currentItem.id) {
        // Update
        const docRef = doc(db, 'menuItems', currentItem.id);
        await updateDoc(docRef, { ...currentItem });
        toast({ title: "Succès", description: "Produit mis à jour." });
      } else {
        // Create - check for unique reference first
        const q = query(collection(db, "menuItems"), where("reference", "==", currentItem.reference));
        const existing = await getDocs(q);
        if (!existing.empty) {
          toast({ title: "Erreur", description: "Cette référence existe déjà. Veuillez en utiliser une autre.", variant: "destructive" });
          return;
        }

        await addDoc(collection(db, 'menuItems'), { ...currentItem, createdAt: serverTimestamp() });
        toast({ title: "Succès", description: "Nouveau produit ajouté." });
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;
    try {
      await deleteDoc(doc(db, 'menuItems', itemId));
      toast({ title: "Succès", description: "Produit supprimé." });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le produit.", variant: "destructive" });
    }
  };

  const handleFileImportClick = () => {
    fileInputRef.current?.click();
  };

    const handleImageUploadClick = () => {
        imageUploadInputRef.current?.click();
    };

    const handleImageFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentItem) return;

        setIsUploading(true);
        try {
            const storageRef = ref(storage, `menu-items/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            setCurrentItem(prev => ({...prev, image: downloadURL}));
            toast({ title: "Image téléversée", description: "L'URL de l'image a été mise à jour." });
        } catch (error) {
            console.error("Error uploading image:", error);
            toast({ title: "Erreur de téléversement", description: "Impossible de téléverser l'image.", variant: "destructive"});
        } finally {
            setIsUploading(false);
            if (imageUploadInputRef.current) {
                imageUploadInputRef.current.value = "";
            }
        }
    };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
            toast({ title: "Fichier Vide", description: "Le fichier Excel ne contient aucune donnée.", variant: "destructive"});
            return;
        }

        // Check for headers
        const headers = Object.keys(json[0]);
        const requiredHeaders = ["Reference", "Nom", "Catégorie", "Prix", "Description"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
             toast({ title: "Erreur d'en-têtes", description: `Les colonnes suivantes sont manquantes: ${missingHeaders.join(', ')}`, variant: "destructive"});
             return;
        }

        let itemsAddedCount = 0;
        let itemsUpdatedCount = 0;
        const batch = writeBatch(db);

        for (const item of json) {
          const itemReference = item.Reference?.toString().trim();
          if (!itemReference) {
              console.warn("Ligne ignorée (Référence manquante):", item);
              continue;
          }

          const newItemData = {
            reference: itemReference,
            name: item.Nom,
            category: item.Catégorie?.toLowerCase().replace(' ', '_'),
            price: parseFloat(item.Prix),
            description: item.Description || '',
            image: item.Image || '',
            availabilityTime: item["Heure de disponibilité"] || '',
          };

          if (!newItemData.name || !newItemData.category || isNaN(newItemData.price)) {
              console.warn("Ligne ignorée (données manquantes ou invalides):", item);
              continue;
          }

          const q = query(collection(db, "menuItems"), where("reference", "==", itemReference));
          const existingDocs = await getDocs(q);

          if (existingDocs.empty) {
            // Add new item
            const newDocRef = doc(collection(db, 'menuItems'));
            batch.set(newDocRef, { ...newItemData, createdAt: serverTimestamp() });
            itemsAddedCount++;
          } else {
            // Update existing item
            const docToUpdateRef = existingDocs.docs[0].ref;
            batch.update(docToUpdateRef, newItemData);
            itemsUpdatedCount++;
          }
        }
        
        await batch.commit();
        toast({ title: "Importation Réussie", description: `${itemsAddedCount} produits ajoutés, ${itemsUpdatedCount} produits mis à jour.` });

      } catch (error) {
        console.error("Error importing file:", error);
        toast({ title: "Erreur d'importation", description: "Le fichier est peut-être corrompu ou mal formaté.", variant: "destructive" });
      } finally {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-headline font-bold">Gestion des produits</h1>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            <Button variant="outline" onClick={handleFileImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                Importer depuis Excel
            </Button>
            <Button onClick={() => handleOpenDialog()}>Ajouter un Produit</Button>
        </div>
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentItem?.id ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Référence (Unique)</Label>
              <Input id="reference" value={currentItem?.reference || ''} onChange={(e) => setCurrentItem({...currentItem, reference: e.target.value})} disabled={!!currentItem?.id} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit</Label>
              <Input id="name" value={currentItem?.name || ''} onChange={(e) => setCurrentItem({...currentItem, name: e.target.value})} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                 <Select value={currentItem?.category} onValueChange={(value) => setCurrentItem({...currentItem, category: value})}>
                    <SelectTrigger id="category">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€)</Label>
                  <Input id="price" type="number" value={currentItem?.price || 0} onChange={(e) => setCurrentItem({...currentItem, price: parseFloat(e.target.value) || 0})} />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="availabilityTime">Heure de disponibilité (optionnel)</Label>
                  <Input id="availabilityTime" type="time" value={currentItem?.availabilityTime || ''} onChange={(e) => setCurrentItem({...currentItem, availabilityTime: e.target.value})} />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={currentItem?.description || ''} onChange={(e) => setCurrentItem({...currentItem, description: e.target.value})} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="image">URL de l'image (optionnel)</Label>
              <div className="flex items-center gap-2">
                <Input id="image" placeholder="https://exemple.com/image.png" value={currentItem?.image || ''} onChange={(e) => setCurrentItem({...currentItem, image: e.target.value})} />
                <input type="file" ref={imageUploadInputRef} onChange={handleImageFileUpload} accept="image/*" className="hidden" />
                <Button type="button" variant="outline" onClick={handleImageUploadClick} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4"/>
                    {isUploading ? "Chargement..." : "Uploader"}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={handleSave}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardContent className="mt-6">
          {loading ? (
            <p>Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('reference')} className="px-0 group">
                        Référence
                        {getSortIndicator('reference')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('name')} className="px-0 group">
                        Nom
                        {getSortIndicator('name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('category')} className="px-0 group">
                        Catégorie
                        {getSortIndicator('category')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('price')} className="px-0 group">
                        Prix
                        {getSortIndicator('price')}
                    </Button>
                  </TableHead>
                  <TableHead>Disponibilité</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMenuItems.length > 0 ? (
                  sortedMenuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.reference}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="capitalize">{item.category?.replace('_', ' ')}</TableCell>
                      <TableCell>{item.price.toFixed(2)} €</TableCell>
                      <TableCell>{item.availabilityTime || 'Toute la journée'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(item)}>Modifier</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>Supprimer</Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">Aucun produit n'a encore été créé.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, MessageSquare, CheckCircle, XCircle, Play, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface QuoteDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

type QuoteStatus = 'new' | 'inProgress' | 'confirmed' | 'completed' | 'cancelled' | 'archived';

interface Quote {
  id: string;
  userName: string;
  userId: string;
  requestDate: string;
  eventDate: string;
  eventTime: string;
  guests: number;
  details: QuoteDetail[];
  status: QuoteStatus;
  cancellationReason?: string;
}

const statusTranslations: Record<QuoteStatus, string> = {
    new: "Nouveau",
    inProgress: "En cours",
    confirmed: "Confirmé",
    completed: "Terminé",
    cancelled: "Annulé",
    archived: "Archivé"
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const quoteId = params.id as string;

  useEffect(() => {
    if (!quoteId) return;

    const fetchQuote = async () => {
        try {
          const docRef = doc(db, 'quotes', quoteId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setQuote({ id: docSnap.id, ...docSnap.data() } as Quote);
          } else {
            toast({
              title: 'Erreur',
              description: 'Devis non trouvé.',
              variant: 'destructive',
            });
            router.push('/admin/quotes');
          }
        } catch (error) {
          console.error('Error fetching quote:', error);
          toast({
            title: 'Erreur',
            description: 'Impossible de charger le devis.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
    };
    
    fetchQuote();
  }, [quoteId, router, toast]);

  const handleStatusUpdate = async (newStatus: QuoteStatus, reason?: string) => {
      if (!quote) return;
      setIsUpdating(true);
      try {
        const docRef = doc(db, 'quotes', quote.id);
        const updateData: { status: QuoteStatus, cancellationReason?: string } = { status: newStatus };
        if (newStatus === 'cancelled' && reason) {
            updateData.cancellationReason = reason;
        }

        await updateDoc(docRef, updateData);
        toast({ title: 'Statut mis à jour', description: `Le devis est maintenant marqué comme : ${statusTranslations[newStatus]}` });
        setQuote(prev => prev ? { ...prev, ...updateData } : null);
      } catch(error) {
         console.error('Error updating status:', error);
         toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut.',
          variant: 'destructive',
        });
      } finally {
        setIsUpdating(false);
        setCancellationReason("");
      }
  };

  const handleCancelQuote = () => {
      if (!cancellationReason.trim()) {
          toast({title: "Motif requis", description: "Veuillez fournir un motif pour l'annulation.", variant: "destructive"});
          return;
      }
      handleStatusUpdate('cancelled', cancellationReason);
  }

  const handleDeleteQuote = async () => {
      if (!quote) return;
      setIsUpdating(true);
      try {
          await deleteDoc(doc(db, 'quotes', quote.id));
          toast({ title: "Devis supprimé", description: "Le devis a été définitivement supprimé." });
          router.push('/admin/quotes');
      } catch (error) {
          console.error('Error deleting quote:', error);
          toast({ title: "Erreur", description: "Impossible de supprimer le devis.", variant: "destructive" });
          setIsUpdating(false);
      }
  }

  const totalAmount = quote?.details.reduce((acc, item) => acc + item.price * item.quantity, 0) || 0;

  if (loading) {
    return <div className="text-center py-12">Chargement du devis...</div>;
  }

  if (!quote) {
    return null;
  }

  const { status } = quote;

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/admin/quotes')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste des devis
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">Détail du Devis</CardTitle>
              <div className="flex items-center gap-4 pt-2">
                 <CardDescription>Demande de {quote.userName}</CardDescription>
                 <Badge>{statusTranslations[status] || status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="font-medium text-muted-foreground">Date de la demande</p>
                  <p>{quote.requestDate}</p>
                </div>
                 <div>
                  <p className="font-medium text-muted-foreground">Date de l'événement</p>
                  <p>{new Date(quote.eventDate).toLocaleDateString('fr-FR')}</p>
                </div>
                 <div>
                  <p className="font-medium text-muted-foreground">Heure de retrait</p>
                  <p>{quote.eventTime}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Nombre d'invités</p>
                  <p>{quote.guests}</p>
                </div>
              </div>
               {quote.status === 'cancelled' && quote.cancellationReason && (
                 <div>
                    <p className="font-medium text-destructive">Motif de l'annulation</p>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">{quote.cancellationReason}</p>
                 </div>
               )}
              <div>
                <p className="font-medium text-muted-foreground mb-2">Détails de la demande</p>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produit</TableHead>
                                <TableHead className="text-center">Quantité</TableHead>
                                <TableHead className="text-right">Prix Unitaire</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {quote.details.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{item.price.toFixed(2)} €</TableCell>
                                    <TableCell className="text-right font-medium">{(item.price * item.quantity).toFixed(2)} €</TableCell>
                                </TableRow>
                            ))}
                             <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={3} className="text-right">Total Général</TableCell>
                                <TableCell className="text-right">{totalAmount.toFixed(2)} €</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
              <CardDescription>Gérez le statut de ce devis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {status === 'new' && (
                <Button className="w-full" disabled={isUpdating} onClick={() => handleStatusUpdate('inProgress')}>
                    <Play className="mr-2 h-4 w-4" />
                    Commencer le traitement
                </Button>
              )}
               {(status === 'new' || status === 'inProgress') && (
                 <>
                    <Button variant="outline" className="w-full" disabled={isUpdating} onClick={() => handleStatusUpdate('confirmed')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marquer comme Confirmé
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full" disabled={isUpdating}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Annuler le devis
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Annuler le devis</AlertDialogTitle>
                                <AlertDialogDescription>Veuillez entrer le motif de l'annulation. Ce motif sera visible par le client.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2">
                                <Label htmlFor="cancellationReason">Motif de l'annulation (obligatoire)</Label>
                                <Textarea id="cancellationReason" value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} placeholder="Ex: Ingrédients non disponibles..." />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Fermer</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelQuote} disabled={!cancellationReason.trim()}>Confirmer l'annulation</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                 </>
               )}
               {status === 'confirmed' && (
                    <Button className="w-full" disabled={isUpdating} onClick={() => handleStatusUpdate('completed')}>
                        <Archive className="mr-2 h-4 w-4" />
                        Marquer comme Terminé
                    </Button>
               )}
                {(status === 'completed' || status === 'cancelled') && (
                     <Button className="w-full" disabled={isUpdating} onClick={() => handleStatusUpdate('archived')}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archiver le devis
                    </Button>
               )}
               {status === 'archived' && (
                   <>
                     <p className="text-sm text-muted-foreground text-center">Ce devis est archivé.</p>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" className="w-full" disabled={isUpdating}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer définitivement
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible et supprimera le devis de manière permanente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteQuote}>Oui, supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                   </>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    
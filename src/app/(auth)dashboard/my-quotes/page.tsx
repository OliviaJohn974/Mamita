
"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Archive, Trash2 } from 'lucide-react';

interface QuoteDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

type QuoteStatus = 'new' | 'inProgress' | 'confirmed' | 'completed' | 'cancelled' | 'archived';

interface Quote {
  id: string;
  requestDate: string;
  eventDate: string;
  status: QuoteStatus;
  details: QuoteDetail[];
  createdAt: any; 
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


export default function MyQuotesPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
        } else {
            setUser(null);
            router.push('/login');
        }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }

    setLoading(true);
    const q = query(
        collection(db, "quotes"),
        where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const quotesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          requestDate: data.requestDate,
          eventDate: data.eventDate,
          status: data.status,
          details: data.details,
          createdAt: data.createdAt,
          cancellationReason: data.cancellationReason
        } as Quote;
      });

      const sortedQuotes = quotesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setQuotes(sortedQuotes);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching quotes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos devis.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

  const handleUpdateStatus = async (quoteId: string, status: QuoteStatus) => {
    const quoteRef = doc(db, 'quotes', quoteId);
    try {
        await updateDoc(quoteRef, { status });
        toast({ title: "Succès", description: "Le statut du devis a été mis à jour."});
    } catch (error) {
        toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: 'destructive' });
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
      const quoteRef = doc(db, 'quotes', quoteId);
      try {
          await deleteDoc(quoteRef);
          toast({ title: "Succès", description: "Le devis a été supprimé."});
      } catch (error) {
          toast({ title: "Erreur", description: "Impossible de supprimer le devis.", variant: 'destructive' });
      }
  };

  const calculateTotal = (details: QuoteDetail[]) => {
    if (!details) return 0;
    return details.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  const activeQuotes = quotes.filter(q => q.status !== 'archived');
  const archivedQuotes = quotes.filter(q => q.status === 'archived');
  
  return (
    <div className="container mx-auto py-12 px-4">
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="font-headline text-3xl">Mes Demandes de Devis</CardTitle>
                <CardDescription>Suivez le statut de toutes vos demandes passées et présentes.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <p className="text-center text-muted-foreground">Chargement de vos devis...</p>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date de Demande</TableHead>
                                    <TableHead>Date d'Événement</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead className="text-center">Statut</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activeQuotes.length > 0 ? (
                                    activeQuotes.map(quote => (
                                        <TableRow key={quote.id}>
                                            <TableCell>{quote.requestDate}</TableCell>
                                            <TableCell>{new Date(quote.eventDate).toLocaleDateString('fr-FR')}</TableCell>
                                            <TableCell>{calculateTotal(quote.details).toFixed(2)} €</TableCell>
                                            <TableCell className="text-center">
                                                {quote.status === 'cancelled' && quote.cancellationReason ? (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="link" className="p-0 text-destructive">
                                                                {statusTranslations[quote.status]} (voir motif)
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Motif de l'annulation</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    {quote.cancellationReason}
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Fermer</AlertDialogCancel>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                ) : (
                                                    <Badge variant="outline">{statusTranslations[quote.status] || quote.status}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {(quote.status === 'completed' || quote.status === 'cancelled') && (
                                                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(quote.id, 'archived')}>
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Archiver
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Vous n'avez pas de demande de devis active.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <Button onClick={() => router.push('/dashboard/quotes')} className="mt-6 w-full">
                            Faire une nouvelle demande de devis
                        </Button>

                        <div className="mt-12">
                            <h3 className="font-headline text-2xl mb-4">Devis Archivés</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date de Demande</TableHead>
                                        <TableHead>Date d'Événement</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                 <TableBody>
                                {archivedQuotes.length > 0 ? (
                                    archivedQuotes.map(quote => (
                                        <TableRow key={quote.id}>
                                            <TableCell>{quote.requestDate}</TableCell>
                                            <TableCell>{new Date(quote.eventDate).toLocaleDateString('fr-FR')}</TableCell>
                                            <TableCell>{calculateTotal(quote.details).toFixed(2)} €</TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="destructive" size="sm">
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Supprimer
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                            <AlertDialogDescription>Cette action est irréversible et supprimera le devis de manière permanente.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteQuote(quote.id)}>Oui, supprimer</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                            Vous n'avez pas de devis archivé.
                                        </TableCell>
                                    </TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
}

    
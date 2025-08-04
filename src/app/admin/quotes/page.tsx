
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";

type QuoteStatus = 'new' | 'inProgress' | 'confirmed' | 'completed' | 'cancelled' | 'archived';

interface Quote {
  id: string;
  userName: string;
  requestDate: string;
  eventDate: string;
  guests: number;
  status: QuoteStatus;
}

function QuotesTable({ data, status }: { data: Quote[], status: QuoteStatus | 'all' }) {
    const router = useRouter();

    const filteredData = status === 'all' 
        ? data.filter(q => q.status !== 'archived')
        : data.filter(q => q.status === status);

    if (filteredData.length === 0) {
        return <p className="text-muted-foreground text-center py-8">Aucun devis dans cette catégorie.</p>;
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Date demande</TableHead>
                    <TableHead>Date événement</TableHead>
                    <TableHead>Invités</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredData.map((quote) => (
                    <TableRow key={quote.id} onClick={() => router.push(`/admin/quotes/${quote.id}`)} className="cursor-pointer">
                        <TableCell className="font-medium">{quote.userName}</TableCell>
                        <TableCell>{quote.requestDate}</TableCell>
                        <TableCell>{new Date(quote.eventDate).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{quote.guests}</TableCell>
                        <TableCell className="text-right">
                            <Button variant="outline" size="sm">Voir détails</Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function AdminQuotesPage() {
    const { toast } = useToast();
    const [quotes, setQuotes] = React.useState<Quote[]>([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const quotesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quote));
            setQuotes(quotesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching quotes: ", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les devis.",
                variant: "destructive"
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);
    
    const getCount = (status: QuoteStatus) => quotes.filter(q => q.status === status).length;

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Gestion des Devis</h1>
      <Card>
        <CardHeader>
          <CardTitle>Demandes de devis</CardTitle>
          <CardDescription>Consultez et gérez les demandes de devis des clients professionnels.</CardDescription>
        </CardHeader>
        <CardContent>
            {loading ? (
                <p>Chargement des devis...</p>
            ) : (
              <Tabs defaultValue="new">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="new">Nouveaux <Badge className="ml-2">{getCount('new')}</Badge></TabsTrigger>
                  <TabsTrigger value="inProgress">En cours <Badge className="ml-2">{getCount('inProgress')}</Badge></TabsTrigger>
                  <TabsTrigger value="confirmed">Confirmés <Badge className="ml-2">{getCount('confirmed')}</Badge></TabsTrigger>
                  <TabsTrigger value="completed">Terminés <Badge className="ml-2">{getCount('completed')}</Badge></TabsTrigger>
                  <TabsTrigger value="cancelled">Annulés <Badge className="ml-2">{getCount('cancelled')}</Badge></TabsTrigger>
                  <TabsTrigger value="archived">
                      <Archive className="mr-2 h-4 w-4" />
                      Archives 
                      <Badge className="ml-2">{getCount('archived')}</Badge>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="new" className="mt-4">
                    <QuotesTable data={quotes} status="new" />
                </TabsContent>
                <TabsContent value="inProgress" className="mt-4">
                    <QuotesTable data={quotes} status="inProgress" />
                </TabsContent>
                <TabsContent value="confirmed" className="mt-4">
                    <QuotesTable data={quotes} status="confirmed" />
                </TabsContent>
                 <TabsContent value="completed" className="mt-4">
                    <QuotesTable data={quotes} status="completed" />
                </TabsContent>
                 <TabsContent value="cancelled" className="mt-4">
                    <QuotesTable data={quotes} status="cancelled" />
                </TabsContent>
                 <TabsContent value="archived" className="mt-4">
                    <QuotesTable data={quotes} status="archived" />
                </TabsContent>
              </Tabs>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

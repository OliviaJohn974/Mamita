
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

type QuoteStatus = 'new' | 'inProgress' | 'confirmed' | 'completed' | 'cancelled' | 'archived';

interface QuoteDetail {
  price: number;
  quantity: number;
}
interface Quote {
  id: string;
  userName: string;
  guests: number;
  eventDate: string; // "YYYY-MM-DD"
  status: QuoteStatus;
  details: QuoteDetail[];
}

const statusTranslations: Record<QuoteStatus, string> = {
    new: "Nouveau",
    inProgress: "En cours",
    confirmed: "Confirmé",
    completed: "Terminé",
    cancelled: "Annulé",
    archived: "Archivé"
};

export default function AdminPlanningPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());

  React.useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("eventDate", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const quotesData: Quote[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userName: data.userName,
          guests: data.guests,
          eventDate: data.eventDate,
          status: data.status,
          details: data.details,
        };
      });
      setQuotes(quotesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching quotes: ", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements du planning.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const quotesOnSelectedDate = selectedDate
    ? quotes.filter(quote => {
        const quoteDate = new Date(quote.eventDate);
        return quoteDate.getFullYear() === selectedDate.getFullYear() &&
               quoteDate.getMonth() === selectedDate.getMonth() &&
               quoteDate.getDate() === selectedDate.getDate();
      })
    : [];

  const eventDays = quotes
    .filter(q => q.status === 'confirmed' || q.status === 'inProgress' || q.status === 'new')
    .map(quote => new Date(quote.eventDate));

  const calculateTotal = (details: QuoteDetail[]) => {
    return details.reduce((acc, item) => acc + item.price * item.quantity, 0);
  };

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Planning des Événements</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
                {loading ? (
                    <p>Chargement du calendrier...</p>
                ) : (
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="w-full"
                        modifiers={{ event: eventDays }}
                        modifiersClassNames={{
                            event: 'bg-primary/20 rounded-full',
                        }}
                    />
                )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Événements du {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : ''}</CardTitle>
              <CardDescription>Liste des demandes de devis pour la date sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
              {quotesOnSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {quotesOnSelectedDate.map(quote => (
                    <li key={quote.id} className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted" onClick={() => router.push(`/admin/quotes/${quote.id}`)}>
                      <div className="flex justify-between items-start">
                        <p className="font-semibold">{quote.userName}</p>
                        <Badge variant="outline">{statusTranslations[quote.status] || quote.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{quote.guests} invités</p>
                      <p className="text-sm text-muted-foreground">Total: {calculateTotal(quote.details).toFixed(2)} €</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">Aucun événement prévu à cette date.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    
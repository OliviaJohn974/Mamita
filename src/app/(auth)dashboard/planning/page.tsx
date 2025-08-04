
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';

type QuoteStatus = 'new' | 'inProgress' | 'confirmed' | 'completed' | 'cancelled' | 'archived';

interface QuoteDetail {
  price: number;
  quantity: number;
}
interface Quote {
  id: string;
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

export default function UserPlanningPage() {
  const { toast } = useToast();
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [user, setUser] = React.useState<FirebaseAuthUser | null>(null);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
            setLoading(false);
        }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "quotes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const quotesData: Quote[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
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
        description: "Impossible de charger vos événements.",
        variant: "destructive"
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);

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
  
  const calculateTotal = (details: QuoteDetail[]): number => {
    if (!details) return 0;
    return details.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-headline font-bold mb-6">Mon Planning</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2">
                {loading ? (
                    <p className="text-center text-muted-foreground p-4">Chargement du calendrier...</p>
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
                        initialFocus
                    />
                )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Événements du {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : ''}</CardTitle>
              <CardDescription>Liste de vos demandes pour la date sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <p className="text-muted-foreground">Chargement...</p>}
              {!loading && quotesOnSelectedDate.length > 0 ? (
                <ul className="space-y-4">
                  {quotesOnSelectedDate.map(quote => (
                    <li key={quote.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between items-start">
                         <p className="font-semibold">{quote.guests} invités</p>
                         <Badge variant="outline">{statusTranslations[quote.status] || quote.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Total: {calculateTotal(quote.details).toFixed(2)} €</p>
                    </li>
                  ))}
                </ul>
              ) : (
                 !loading && <p className="text-muted-foreground">Aucun événement prévu à cette date.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

    
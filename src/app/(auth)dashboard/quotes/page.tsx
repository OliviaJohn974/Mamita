
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, onSnapshot, query, doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Minus, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { onAuthStateChanged, User as FirebaseAuthUser } from "firebase/auth";

const quoteSchema = z.object({
  eventDate: z.string().min(1, "Veuillez sélectionner une date.").refine(date => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const selectedDate = new Date(date);
    return selectedDate > today;
  }, { message: "La date de l'événement ne peut pas être aujourd'hui ou une date passée." }),
  eventTime: z.string().min(1, "Veuillez sélectionner une heure."),
  guests: z.coerce.number().min(1, "Veuillez indiquer le nombre d'invités."),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface UserData {
  uid: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  availabilityTime?: string;
}

interface SelectedItem extends MenuItem {
    quantity: number;
}

interface TimeSlot {
    value: string;
    label: string;
}

export default function QuoteRequestPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [minQuoteAmount, setMinQuoteAmount] = useState(0);

    const { register, handleSubmit, control, formState: { errors } } = useForm<QuoteFormData>({
        resolver: zodResolver(quoteSchema),
        defaultValues: {
            eventTime: ''
        }
    });
    
    const selectedEventTime = useWatch({
      control,
      name: "eventTime",
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser(userDoc.data() as UserData);
                }
            } else {
                setUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
             const settingsDocRef = doc(db, 'settings', "global_settings");
             const docSnap = await getDoc(settingsDocRef);
             if (docSnap.exists()) {
                const settings = docSnap.data();
                const { startTime = '07:30', endTime = '18:00', timeSlotInterval = 30, minQuoteAmount = 0 } = settings;
                generateTimeSlots(startTime, endTime, timeSlotInterval);
                setMinQuoteAmount(minQuoteAmount);
             } else {
                 generateTimeSlots('07:30', '18:00', 30); // Default values
             }
        };
        fetchSettings();

    }, []);

    const generateTimeSlots = (start: string, end: string, interval: number) => {
        const slots: TimeSlot[] = [];
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);

        let currentTime = new Date();
        currentTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        
        while (currentTime <= endTime) {
            const timeString = currentTime.toTimeString().slice(0, 5);
            slots.push({ value: timeString, label: timeString });
            currentTime.setMinutes(currentTime.getMinutes() + interval);
        }
        setTimeSlots(slots);
    };
    
    useEffect(() => {
        const q = query(collection(db, "menuItems"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
            setMenuItems(items);

            const uniqueCategories = [...new Set(items.map(item => item.category))];
            const categoryOptions = uniqueCategories.map(cat => ({
                id: cat,
                label: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')
            }));
            setCategories([{ id: 'all', label: 'Tout' }, ...categoryOptions]);
        });
        return () => unsubscribe();
    }, []);

    const handleAddItem = (item: MenuItem, quantity: number = 1) => {
        if (quantity <= 0) return;

        setSelectedItems(prev => {
            const existingItem = prev.find(i => i.id === item.id);
            if (existingItem) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
            } else {
                return [...prev, { ...item, quantity }];
            }
        });
    };
    
    const updateQuantity = (itemId: string, newQuantity: number) => {
        if (newQuantity <= 0) {
            handleRemoveItem(itemId);
            return;
        }
        setSelectedItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: newQuantity } : item));
    }

    const handleRemoveItem = (itemId: string) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemId));
    };

    const totalAmount = selectedItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const isQuoteValid = totalAmount >= minQuoteAmount;

    const onSubmit = async (data: QuoteFormData) => {
        if (!user) {
            toast({ title: "Erreur", description: "Vous devez être connecté pour faire une demande.", variant: "destructive" });
            return;
        }
        if (selectedItems.length === 0) {
            toast({ title: "Erreur", description: "Votre devis est vide. Veuillez ajouter des produits.", variant: "destructive"});
            return;
        }
         if (!isQuoteValid) {
            toast({ title: "Montant minimum requis", description: `Le montant total de votre devis doit être d'au moins ${minQuoteAmount.toFixed(2)} € pour pouvoir être soumis.`, variant: "destructive"});
            return;
        }
        
        setIsSubmitting(true);
        try {
            const details = selectedItems.map(item => ({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }));

            await addDoc(collection(db, "quotes"), {
                ...data,
                details: details,
                userId: user.uid,
                userName: user.name,
                status: "new",
                requestDate: new Date().toLocaleDateString('fr-FR'),
                createdAt: serverTimestamp(),
            });
            toast({ title: "Demande envoyée !", description: "Nous avons bien reçu votre demande de devis." });
            router.push("/dashboard");
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({ title: "Erreur", description: "Une erreur est survenue lors de l'envoi.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getTomorrowDate = () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }
    
    const filteredMenuItems = activeCategory === 'all'
        ? menuItems
        : menuItems.filter(item => item.category === activeCategory);
        
    const isItemSelected = (itemId: string) => selectedItems.some(item => item.id === itemId);

    const isItemAvailable = (item: MenuItem): boolean => {
        if (!selectedEventTime) return true;
        if (!item.availabilityTime) return true;
        return selectedEventTime >= item.availabilityTime;
    }

    const getButtonLabel = () => {
        if (isSubmitting) return "Envoi en cours...";
        if (!isQuoteValid && minQuoteAmount > 0) {
            return `Montant minimum de ${minQuoteAmount.toFixed(2)} € requis`;
        }
        return "Envoyer la demande de devis";
    }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Composer votre Devis</CardTitle>
          <CardDescription>
            Remplissez les informations concernant la date et l'heure à laquelle vous souhaitez que votre commande soit prête.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="event-date">Date de l'événement</Label>
                    <Input id="event-date" type="date" {...register("eventDate")} min={getTomorrowDate()} />
                     {errors.eventDate && <p className="text-sm text-destructive">{errors.eventDate.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="event-time">Heure de retrait</Label>
                    <Controller
                        name="eventTime"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="--:--" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timeSlots.map(slot => (
                                        <SelectItem key={slot.value} value={slot.value}>
                                            {slot.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     {errors.eventTime && <p className="text-sm text-destructive">{errors.eventTime.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="guests">Nombre d'invités</Label>
                    <Input id="guests" type="number" placeholder="50" {...register("guests")} min="1" />
                    {errors.guests && <p className="text-sm text-destructive">{errors.guests.message}</p>}
                </div>
            </div>

            <Separator />
            
            <div>
              <CardTitle className="text-2xl mb-4">Votre Devis</CardTitle>
              {selectedItems.length > 0 ? (
                <div className="space-y-2">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{(item.price * item.quantity).toFixed(2)} €</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                            type="number"
                            className="w-16 h-8 text-center"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                            min="1"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Separator className="my-4" />
                   <div className="text-right font-bold text-lg">
                        Total: {totalAmount.toFixed(2)} €
                    </div>
                    {minQuoteAmount > 0 && !isQuoteValid && (
                        <p className='text-right text-sm text-destructive'>
                            (Montant minimum requis: {minQuoteAmount.toFixed(2)} €)
                        </p>
                    )}
                </div>
              ) : (
                <p className="text-muted-foreground">Votre devis est vide. Ajoutez des produits ci-dessous.</p>
              )}
            </div>
            
            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting || !isQuoteValid || !selectedEventTime}>
                {getButtonLabel()}
            </Button>

            <Separator />

            <div>
              <CardTitle className="text-2xl mb-4">Nos Produits</CardTitle>
               {!selectedEventTime && (
                <p className="text-center text-destructive bg-destructive/10 p-3 rounded-md mb-4">
                    Veuillez d'abord sélectionner une heure de retrait pour voir la disponibilité des produits.
                </p>
               )}
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    type="button"
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md">
                {filteredMenuItems.map(item => {
                    const available = isItemAvailable(item);
                    return (
                        <Card key={item.id} className={cn(isItemSelected(item.id) ? 'bg-muted/50' : '', (!available || !selectedEventTime) && 'opacity-50 bg-muted/30')}>
                            <CardHeader>
                            <CardTitle className="text-lg">{item.name}</CardTitle>
                            <CardDescription>{item.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-lg">{item.price.toFixed(2)} €</p>
                                    {selectedEventTime && (
                                        available ? (
                                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                                        ) : (
                                            item.availabilityTime && (
                                                <div className="text-xs text-destructive-foreground bg-destructive/80 border border-destructive px-2 py-1 rounded-md">
                                                    Pas avant {item.availabilityTime}
                                                </div>
                                            )
                                        )
                                    )}
                                </div>
                                <Button 
                                    type="button" 
                                    onClick={() => handleAddItem(item)} 
                                    disabled={isItemSelected(item.id) || !available || !selectedEventTime} 
                                    className="w-full"
                                >
                                    {isItemSelected(item.id) ? 'Ajouté' : 'Ajouter au devis'}
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
              </div>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}

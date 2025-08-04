
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2 } from 'lucide-react';
import { NewsletterSender } from '@/components/admin/newsletter-sender';
import { Textarea } from '@/components/ui/textarea';

const EXTERNAL_SUBSCRIBERS_DOC_ID = "external_newsletter_subscribers";

interface User {
  uid: string;
  email: string;
}

interface ExternalSubscribers {
    mamita: string[];
    boutiqueCafe: string[];
}

interface PreviewContent {
    success: boolean;
    count: number;
    message: string;
    subject?: string;
    body?: string;
}

export default function AdminNewsletterPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [mamitaSubscribers, setMamitaSubscribers] = useState<User[]>([]);
    const [boutiqueCafeSubscribers, setBoutiqueCafeSubscribers] = useState<User[]>([]);
    const [externalSubscribers, setExternalSubscribers] = useState<ExternalSubscribers>({ mamita: [], boutiqueCafe: [] });
    
    const [newMamitaEmail, setNewMamitaEmail] = useState("");
    const [newBoutiqueCafeEmail, setNewBoutiqueCafeEmail] = useState("");

    const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null);
    const [activeTab, setActiveTab] = useState("mamita");


    useEffect(() => {
        setLoading(true);
        const mamitaQuery = query(collection(db, "users"), where("newsletterMamita", "==", true));
        const unsubscribeMamita = onSnapshot(mamitaQuery, (snapshot) => {
            setMamitaSubscribers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
        });

        const boutiqueQuery = query(collection(db, "users"), where("newsletterBoutiqueCafe", "==", true));
        const unsubscribeBoutique = onSnapshot(boutiqueQuery, (snapshot) => {
            setBoutiqueCafeSubscribers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
        });
        
        const externalDocRef = doc(db, 'settings', EXTERNAL_SUBSCRIBERS_DOC_ID);
        const unsubscribeExternal = onSnapshot(externalDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setExternalSubscribers({
                    mamita: data.mamita || [],
                    boutiqueCafe: data.boutiqueCafe || [],
                });
            }
            setLoading(false);
        });

        return () => {
            unsubscribeMamita();
            unsubscribeBoutique();
            unsubscribeExternal();
        };
    }, []);
    
    const handleAddExternalEmail = async (list: 'mamita' | 'boutiqueCafe') => {
        const emailToAdd = list === 'mamita' ? newMamitaEmail : newBoutiqueCafeEmail;

        if (!emailToAdd || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) {
            toast({ title: "Email invalide", description: "Veuillez entrer une adresse email valide.", variant: "destructive"});
            return;
        }

        const lowercasedEmail = emailToAdd.toLowerCase();
        
        if (externalSubscribers[list].includes(lowercasedEmail)) {
            toast({ title: "Déjà inscrit", description: "Cet email est déjà dans la liste externe.", variant: "destructive"});
            return;
        }

        setIsSaving(true);
        const newExternalList = [...externalSubscribers[list], lowercasedEmail];
        const docRef = doc(db, 'settings', EXTERNAL_SUBSCRIBERS_DOC_ID);

        try {
            await setDoc(docRef, { [list]: newExternalList }, { merge: true });
            toast({ title: "Email ajouté", description: `L'adresse a été ajoutée.`});
            if (list === 'mamita') setNewMamitaEmail("");
            else setNewBoutiqueCafeEmail("");
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'ajouter l'email.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteExternalEmail = async (list: 'mamita' | 'boutiqueCafe', emailToDelete: string) => {
        if (!window.confirm(`Voulez-vous vraiment supprimer ${emailToDelete} de cette liste ?`)) return;

        setIsSaving(true);
        const newExternalList = externalSubscribers[list].filter(email => email !== emailToDelete);
        const docRef = doc(db, 'settings', EXTERNAL_SUBSCRIBERS_DOC_ID);

        try {
            await setDoc(docRef, { [list]: newExternalList }, { merge: true });
            toast({ title: "Email supprimé", description: `L'adresse a été retirée de la liste.`});
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de supprimer l'email.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handlePreviewGenerated = (content: PreviewContent) => {
        setPreviewContent(content);
        setActiveTab("preview");
    };


    if (loading) return <div>Chargement des abonnés...</div>;

    const renderSubscriberList = (
        title: string, 
        users: User[], 
        external: string[], 
        listType: 'mamita' | 'boutiqueCafe',
        menuId: 'menu_1' | 'menu_2',
        newEmail: string,
        setNewEmail: (value: string) => void
    ) => (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>
                            Total : {users.length + external.length} abonné(s)
                            ({users.length} utilisateurs, {external.length} externes).
                        </CardDescription>
                    </div>
                    <NewsletterSender menuId={menuId} onPreviewGenerated={handlePreviewGenerated} />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor={`new-email-${listType}`}>Ajouter un email externe</Label>
                        <div className="flex gap-2">
                            <Input 
                                id={`new-email-${listType}`}
                                type="email"
                                placeholder="nouvel.abonné@email.com"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                            />
                            <Button onClick={() => handleAddExternalEmail(listType)} disabled={isSaving || !newEmail}>
                                Ajouter
                            </Button>
                        </div>
                    </div>
                    <Separator />
                    <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                        <h4 className="font-semibold text-sm text-muted-foreground">Utilisateurs inscrits</h4>
                        {users.length > 0 ? users.map(user => (
                            <p key={user.uid} className="text-sm p-2 bg-muted/30 rounded-md">{user.email}</p>
                        )) : <p className="text-sm text-muted-foreground">Aucun utilisateur inscrit.</p>}
                        
                        <h4 className="font-semibold text-sm text-muted-foreground mt-4">Abonnés externes</h4>
                        {external.length > 0 ? external.map(email => (
                             <div key={email} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded-md">
                                <span>{email}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteExternalEmail(listType, email)} disabled={isSaving}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                        )) : <p className="text-sm text-muted-foreground">Aucun abonné externe.</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div>
            <h1 className="text-3xl font-headline font-bold mb-2">Gestion des Newsletters</h1>
             <p className="text-muted-foreground mb-6">
                Consultez la liste des abonnés, ajoutez des contacts externes, prévisualisez et envoyez les menus du jour.
            </p>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-6">
                    <TabsTrigger value="mamita">Menu du Mamita</TabsTrigger>
                    <TabsTrigger value="boutiqueCafe">Menu Boutique Café</TabsTrigger>
                    <TabsTrigger value="preview">Aperçu</TabsTrigger>
                </TabsList>

                <TabsContent value="mamita">
                    {renderSubscriberList(
                        "Abonnés - Menu du Mamita",
                        mamitaSubscribers,
                        externalSubscribers.mamita,
                        'mamita',
                        'menu_1',
                        newMamitaEmail,
                        setNewMamitaEmail
                    )}
                </TabsContent>
                
                <TabsContent value="boutiqueCafe">
                    {renderSubscriberList(
                        "Abonnés - Menu Boutique Café",
                        boutiqueCafeSubscribers,
                        externalSubscribers.boutiqueCafe,
                        'boutiqueCafe',
                        'menu_2',
                        newBoutiqueCafeEmail,
                        setNewBoutiqueCafeEmail
                    )}
                </TabsContent>
                 <TabsContent value="preview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Aperçu de la Newsletter</CardTitle>
                             <CardDescription>
                                {previewContent?.message || "Générez ou envoyez un menu pour voir l'aperçu ici."}
                             </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             {previewContent?.body ? (
                                <>
                                    <div>
                                        <Label>Sujet de l'email</Label>
                                        <Input readOnly value={previewContent.subject || ''} />
                                    </div>
                                    <Separator/>
                                    <div>
                                        <Label>Rendu Visuel</Label>
                                        <div className="border rounded-md p-4 mt-2 h-[800px] overflow-y-auto bg-white">
                                            <div dangerouslySetInnerHTML={{ __html: previewContent.body }} />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-muted-foreground py-16">
                                    Aucun aperçu à afficher.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

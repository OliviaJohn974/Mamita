
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React, { useState, useEffect } from "react";
import { Calendar, ClipboardList, AlertTriangle, Trash2, Mail, Edit, Save } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User as FirebaseAuthUser, deleteUser, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, getDoc, deleteDoc, collection, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";


interface UserData {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'professional' | 'customer';
  status: 'active' | 'pending' | 'rejected';
  date: string;
  newsletterMamita?: boolean;
  newsletterBoutiqueCafe?: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [confirmText, setConfirmText] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', email: '' });
  const [currentPassword, setCurrentPassword] = useState('');

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseAuthUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = { ...userDoc.data(), uid: userDoc.id } as UserData;
            setUser(userData);
            setEditData({ name: userData.name, email: userData.email });
            sessionStorage.setItem('user', JSON.stringify(userData));
        } else {
            console.error("User document not found in Firestore.");
            setUser(null);
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !user) return;
    
    let needsReauth = editData.email !== user.email;

    try {
        if (needsReauth) {
            if (!currentPassword) {
                toast({ title: "Mot de passe requis", description: "Veuillez entrer votre mot de passe pour changer d'email.", variant: "destructive"});
                return;
            }
            const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            await updateEmail(currentUser, editData.email);
        }

        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            name: editData.name,
            email: editData.email
        });

        const updatedUser = { ...user, name: editData.name, email: editData.email };
        setUser(updatedUser);
        sessionStorage.setItem('user', JSON.stringify(updatedUser));

        toast({ title: "Profil mis à jour", description: "Vos informations ont été enregistrées."});
        setIsEditing(false);
        setCurrentPassword('');

    } catch (error: any) {
        console.error("Error updating profile:", error);
        let description = "Une erreur est survenue.";
        if (error.code === 'auth/wrong-password') {
            description = "Mot de passe incorrect.";
        } else if (error.code === 'auth/email-already-in-use') {
            description = "Cet email est déjà utilisé par un autre compte.";
        }
        toast({ title: "Erreur", description, variant: "destructive" });
    }
  };
  
  const handleAccountDeletion = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || !user) {
        toast({ title: "Erreur", description: "Aucun utilisateur connecté.", variant: "destructive" });
        return;
    }

    setIsDeleting(true);
    try {
        if (reason || suggestions) {
            await addDoc(collection(db, "closure_feedback"), {
                userId: user.uid,
                userRole: user.role,
                reason: reason || "Non spécifié",
                suggestions: suggestions || "Aucune",
                deletedAt: serverTimestamp()
            });
        }
        
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(currentUser);

        toast({ title: "Compte supprimé", description: "Votre compte a été supprimé avec succès." });
        router.push("/");

    } catch (error: any) {
        console.error("Error deleting account:", error);
        let description = "Une erreur est survenue lors de la suppression de votre compte.";
        if (error.code === 'auth/requires-recent-login') {
            description = "Cette opération est sensible et nécessite une authentification récente. Veuillez vous reconnecter et réessayer.";
        }
        toast({ title: "Erreur", description, variant: "destructive" });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleNewsletterChange = async (type: 'newsletterMamita' | 'newsletterBoutiqueCafe', checked: CheckedState) => {
    if (!user) return;
    const isSubscribed = !!checked;
    
    const updatedUser = { ...user, [type]: isSubscribed };
    setUser(updatedUser);

    try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            [type]: isSubscribed
        });
        toast({
            title: "Préférences mises à jour",
            description: `Vous ${isSubscribed ? 'êtes maintenant abonné(e)' : 'vous êtes désabonné(e)'}.`
        });
    } catch (error) {
        const revertedUser = { ...user, [type]: !isSubscribed };
        setUser(revertedUser);
        toast({ title: "Erreur", description: "Impossible de mettre à jour vos préférences.", variant: "destructive" });
    }
  };


  const isProfessional = user?.role === 'professional';
  const isCustomer = user?.role === 'customer';
  const isAdmin = user?.role === 'admin';
  const canDelete = isProfessional || isCustomer;

  if (loading) {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-headline font-bold mb-6">Chargement...</h1>
        </div>
    );
  }

  if (!user) {
     return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-3xl font-headline font-bold mb-6">Veuillez vous connecter.</h1>
             <p className="text-muted-foreground">Vous devez être connecté pour accéder à cette page.</p>
        </div>
    );
  }


  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-headline font-bold mb-2">Mon Espace</h1>
        <p className="text-muted-foreground mb-8">Bienvenue, {user.name}. Gérez vos informations ici.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mes Informations</CardTitle>
                {!isAdmin && (
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Modifier mes informations</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Nom</Label>
                                    <Input id="edit-name" value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input id="edit-email" type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} />
                                </div>
                                {editData.email !== user.email && (
                                    <div className="space-y-2 p-3 bg-destructive/10 rounded-md border border-destructive/20">
                                        <Label htmlFor="current-password">Mot de passe actuel</Label>
                                        <p className="text-xs text-destructive">Pour changer votre adresse email, veuillez confirmer votre mot de passe.</p>
                                        <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                                <Button onClick={handleUpdateProfile}>Enregistrer</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom</p>
                  <p>{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{user.email}</p>
                </div>
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">Type de compte</p>
                  <p className="capitalize">{user.role}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Mail />Préférences de communication</CardTitle>
                    <CardDescription>Gérez vos abonnements à nos newsletters.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="newsletterMamita" 
                            checked={user.newsletterMamita}
                            onCheckedChange={(checked) => handleNewsletterChange('newsletterMamita', checked)}
                        />
                        <Label htmlFor="newsletterMamita" className="font-normal">
                            Recevoir les menus du Mamita par email tous les jours
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                         <Checkbox 
                            id="newsletterBoutiqueCafe" 
                            checked={user.newsletterBoutiqueCafe}
                            onCheckedChange={(checked) => handleNewsletterChange('newsletterBoutiqueCafe', checked)}
                         />
                        <Label htmlFor="newsletterBoutiqueCafe" className="font-normal">
                            Recevoir les menus de la Boutique Café par email tous les jours
                        </Label>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Mon Planning</CardTitle>
                    <CardDescription>Consultez vos événements à venir.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <a href="/dashboard/planning">
                            <Calendar className="mr-2 h-4 w-4" />
                            Voir mon planning
                        </a>
                    </Button>
                </CardContent>
            </Card>
            {isProfessional && (
              <Card>
                <CardHeader>
                  <CardTitle>Mes Devis</CardTitle>
                  <CardDescription>Consultez l'historique et le statut de vos demandes de devis.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <a href="/dashboard/my-quotes">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Voir mes devis
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-8">
             {isProfessional && (
              <Card>
                  <CardHeader>
                      <CardTitle>Espace Professionnel</CardTitle>
                      <CardDescription>Accédez à vos services dédiés.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button asChild className="w-full">
                          <a href="/dashboard/quotes">Demander un nouveau devis</a>
                      </Button>
                  </CardContent>
              </Card>
            )}

            {canDelete && (
                <Card className="border-destructive">
                     <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <AlertTriangle />
                            Zone de Danger
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            La suppression de votre compte est définitive et entraînera la perte de toutes vos données.
                        </p>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="destructive" className="w-full">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Fermer mon compte
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Cette action est irréversible. Pour nous aider à nous améliorer, vous pouvez nous laisser un commentaire (optionnel).
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-4 my-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Pourquoi partez-vous ? (Optionnel)</Label>
                                        <Select onValueChange={setReason}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionnez une raison" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="not_using_service">Je n'utilise plus le service</SelectItem>
                                                <SelectItem value="found_alternative">J'ai trouvé une autre solution</SelectItem>
                                                <SelectItem value="privacy_concerns">Inquiétudes sur la confidentialité</SelectItem>
                                                <SelectItem value="other">Autre</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="suggestions">Suggestions d'amélioration (Optionnel)</Label>
                                        <Textarea id="suggestions" value={suggestions} onChange={(e) => setSuggestions(e.target.value)} placeholder="Vos idées sont les bienvenues..."/>
                                    </div>
                                     <Separator />
                                    <div className="space-y-2">
                                        <Label htmlFor="confirmText">Pour confirmer, veuillez taper "SUPPRIMER" ci-dessous</Label>
                                        <Input id="confirmText" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SUPPRIMER" />
                                    </div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleAccountDeletion} 
                                        disabled={confirmText !== 'SUPPRIMER' || isDeleting}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {isDeleting ? "Suppression en cours..." : "Oui, supprimer mon compte"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

    

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, limit } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [accountType, setAccountType] = React.useState("particulier");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (accountType === 'professionnel' && !name.trim()) {
        toast({
            title: "Champ requis",
            description: "Le nom de l'entreprise ou votre nom est requis pour un compte professionnel.",
            variant: "destructive"
        });
        return;
    }
    
    try {
        // Check if this is the first user
        const usersRef = collection(db, "users");
        const q = query(usersRef, limit(1));
        const querySnapshot = await getDocs(q);
        const isFirstUser = querySnapshot.empty;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        let role = 'customer';
        let status = 'active';
        let displayName = email;

        if (isFirstUser) {
            // First user is always admin
            role = 'admin';
            status = 'active';
            displayName = 'Admin';
        } else if (accountType === 'professionnel') {
            role = 'professional';
            status = 'pending';
            displayName = name;
        }


        // Store user details in Firestore
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: displayName,
            email: user.email,
            role: role,
            status: status,
            date: new Date().toLocaleDateString('fr-FR'),
        });

        if (role === "admin") {
             toast({
                title: "Compte Administrateur créé",
                description: "Votre compte administrateur est prêt. Vous pouvez vous connecter.",
            });
        } else if (role === "professional") {
            toast({
                title: "Inscription enregistrée",
                description: "Votre compte est en attente de validation par un administrateur.",
            });
        } else {
            toast({
                title: "Inscription réussie",
                description: "Votre compte a été créé. Vous pouvez maintenant vous connecter.",
            });
        }
        router.push("/login");

    } catch (error: any) {
         toast({
            title: "Erreur d'inscription",
            description: error.code === 'auth/email-already-in-use' 
                ? "Cet email est déjà utilisé." 
                : "Une erreur est survenue.",
            variant: "destructive"
        });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Créer un compte</CardTitle>
          <CardDescription>Rejoignez-nous pour profiter de nos services et offres.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-6">
                <div className="flex flex-col space-y-2.5">
                    <Label>Type de compte</Label>
                    <RadioGroup 
                        defaultValue="particulier" 
                        className="flex flex-col space-y-2"
                        value={accountType}
                        onValueChange={setAccountType}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="particulier" id="particulier" />
                        <Label htmlFor="particulier">Client Particulier</Label>
                      </div>
                       <p className="text-xs text-muted-foreground pl-6">Validation par email. Accès standard.</p>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="professionnel" id="professionnel" />
                        <Label htmlFor="professionnel">Client Professionnel</Label>
                      </div>
                       <p className="text-xs text-muted-foreground pl-6">Validation par l'administrateur. Permet de demander des devis.</p>
                    </RadioGroup>
                </div>

                {accountType === 'professionnel' && (
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="name">Nom / Nom de l'entreprise</Label>
                        <Input id="name" type="text" placeholder="Ex: John Doe Events" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                )}

              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="votre.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="Créez un mot de passe sécurisé" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" type="submit">Créer le compte</Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Button variant="link" asChild className="p-0">
                <Link href="/login">
                  Se connecter
                </Link>
              </Button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

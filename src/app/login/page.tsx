
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user details from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        toast({
          title: "Erreur de connexion",
          description: "Profil utilisateur non trouvé.",
          variant: "destructive",
        });
        await auth.signOut();
        return;
      }
      
      const userData = userDoc.data();

      // Check for admin role first
      if (userData.role === "admin") {
         sessionStorage.setItem('user', JSON.stringify(userData));
         toast({
            title: "Connexion réussie",
            description: "Bienvenue, administrateur.",
         });
         router.push("/admin");
         return;
      }

      if (userData.role === "professional") {
        if (userData.status === "pending") {
          toast({
            title: "Compte en attente",
            description: "Votre compte professionnel est en attente de validation par un administrateur.",
            variant: "destructive",
          });
          await auth.signOut();
          return;
        }
        
        if (userData.status === "rejected") {
          toast({
            title: "Compte rejeté",
            description: "Votre demande de compte professionnel a été rejetée.",
            variant: "destructive",
          });
          await auth.signOut();
          return;
        }
      }

      // If validation passes for any other user type (customer, active professional)
      sessionStorage.setItem('user', JSON.stringify(userData));
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur votre espace.",
      });
      router.push("/dashboard");

    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Se connecter</CardTitle>
          <CardDescription>Accédez à votre espace personnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="votre.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="Votre mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            <Button className="w-full mt-6" type="submit">Connexion</Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Button variant="link" asChild className="p-0">
              <Link href="/signup">
                S'inscrire
              </Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

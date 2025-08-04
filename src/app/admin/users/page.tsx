
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X } from "lucide-react";
import React from "react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'professional' | 'customer';
  status: 'active' | 'pending' | 'rejected';
  date: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<User[]>([]);
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const userList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setUsers(userList);
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible de charger les utilisateurs.",
            variant: "destructive"
        })
    } finally {
        setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusUpdate = async (userId: string, newStatus: 'active' | 'rejected') => {
    try {
        const userDocRef = doc(db, "users", userId);
        await updateDoc(userDocRef, { status: newStatus });
        
        toast({
          title: newStatus === 'active' ? "Utilisateur approuvé" : "Utilisateur rejeté",
          description: newStatus === 'active' 
            ? "Le compte professionnel a été activé."
            : "La demande de compte a été rejetée.",
        });
        
        // Refetch users to update the UI
        fetchUsers();
    } catch (error) {
         toast({
            title: "Erreur",
            description: "Impossible de mettre à jour l'utilisateur.",
            variant: "destructive"
        })
    }
  };

  const pendingUsers = users.filter(user => user.role === 'professional' && user.status === 'pending');
  const activeProUsers = users.filter(user => user.role === 'professional' && user.status === 'active');
  const regularUsers = users.filter(user => user.role === 'customer');

  if (loading) {
    return <div>Chargement des utilisateurs...</div>
  }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Gestion des Utilisateurs</h1>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs en attente de validation</CardTitle>
            <CardDescription>Approuvez ou rejetez les demandes de compte professionnel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom / Entreprise</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date de demande</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.length > 0 ? (
                  pendingUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.date}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleStatusUpdate(user.uid, 'active')}>
                          <Check className="h-4 w-4" />
                          <span className="sr-only">Approuver</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => handleStatusUpdate(user.uid, 'rejected')}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Rejeter</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      Aucune demande en attente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comptes Professionnels Actifs</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nom / Entreprise</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {activeProUsers.length > 0 ? (
                        activeProUsers.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.date}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                Aucun compte professionnel actif.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Comptes Particuliers</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Date d'inscription</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {regularUsers.length > 0 ? (
                        regularUsers.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.date}</TableCell>
                            </TableRow>
                        ))
                    ) : (
                         <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                Aucun compte particulier.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

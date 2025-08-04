
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, ClipboardList, Utensils, AlertTriangle, User, FileText, ExternalLink } from "lucide-react";
import Link from 'next/link';
import React from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer, orderBy, limit, onSnapshot } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UserData {
  uid: string;
  name: string;
  email: string;
  date: string;
  role: 'admin' | 'professional' | 'customer';
}

interface QuoteData {
  id: string;
  userName: string;
  requestDate: string;
  status: string;
}


function StatCard({ title, value, icon, description, href, disabled }: { title: string, value: string, icon: React.ReactNode, description: string, href: string, disabled?: boolean }) {
  const cardContent = (
    <Card className={cn(disabled && "bg-muted/50 pointer-events-none")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (disabled || href === "#") {
      return <div className="cursor-not-allowed">{cardContent}</div>;
  }
  
  return <Link href={href} className="hover:shadow-lg transition-shadow rounded-lg">{cardContent}</Link>;
}


export default function AdminDashboardPage() {
    const [stats, setStats] = React.useState({
        pendingUsers: "0",
        openQuotes: "0",
        totalProducts: "0",
    });
    const [recentUsers, setRecentUsers] = React.useState<UserData[]>([]);
    const [recentQuotes, setRecentQuotes] = React.useState<QuoteData[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const pendingUsersQuery = query(collection(db, "users"), where("status", "==", "pending"));
                const pendingUsersSnapshot = await getCountFromServer(pendingUsersQuery);
                const pendingUsersCount = pendingUsersSnapshot.data().count;

                const openQuotesQuery = query(collection(db, "quotes"), where("status", "==", "new"));
                const openQuotesSnapshot = await getCountFromServer(openQuotesQuery);
                const openQuotesCount = openQuotesSnapshot.data().count;

                const productsQuery = query(collection(db, "menuItems"));
                const productsSnapshot = await getCountFromServer(productsQuery);
                const productsCount = productsSnapshot.data().count;

                setStats({
                    pendingUsers: pendingUsersCount.toString(),
                    openQuotes: openQuotesCount.toString(),
                    totalProducts: productsCount.toString(),
                });

            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Listen for recent users
        const usersQuery = query(collection(db, "users"), orderBy("date", "desc"), limit(5));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            setRecentUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
        });

        // Listen for recent quotes
        const quotesQuery = query(collection(db, "quotes"), orderBy("createdAt", "desc"), limit(5));
        const unsubscribeQuotes = onSnapshot(quotesQuery, (snapshot) => {
            setRecentQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuoteData)));
        });

        return () => {
            unsubscribeUsers();
            unsubscribeQuotes();
        }

    }, []);

    const statCards = [
      { title: "Utilisateurs en attente", value: loading ? "..." : stats.pendingUsers, icon: <Users className="h-6 w-6 text-muted-foreground" />, description: "Approbation manuelle requise", href: "/admin/users" },
      { title: "Devis ouverts", value: loading ? "..." : stats.openQuotes, icon: <ClipboardList className="h-6 w-6 text-muted-foreground" />, description: "Devis à traiter", href: "/admin/quotes" },
      { title: "Produits au menu", value: loading ? "..." : stats.totalProducts, icon: <Utensils className="h-6 w-6 text-muted-foreground" />, description: "Total des produits gérés", href: "/admin/menu" },
      { title: "Alertes", value: "0", icon: <AlertTriangle className="h-6 w-6 text-muted-foreground" />, description: "Aucune action requise", href: "#", disabled: true },
    ];


  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Tableau de bord Administrateur</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>
      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
                <CardDescription>Dernières actions sur la plateforme.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-8 md:grid-cols-2">
                <div>
                   <h3 className="font-semibold text-lg mb-4 flex items-center">
                       <User className="mr-2 h-5 w-5" />
                       Nouveaux Utilisateurs
                    </h3>
                    {loading ? <p className="text-sm text-muted-foreground">Chargement...</p> : recentUsers.length > 0 ? (
                        <ul className="space-y-3">
                        {recentUsers.map(user => (
                            <li key={user.uid} className="text-sm">
                               <p><span className="font-medium">{user.name}</span> ({user.email})</p>
                               <p className="text-xs text-muted-foreground">
                                   Role: {user.role} | Inscrit le {user.date}
                                </p>
                            </li>
                        ))}
                    </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">Aucun nouvel utilisateur.</p>
                    )}
                </div>
                 <div>
                   <h3 className="font-semibold text-lg mb-4 flex items-center">
                       <FileText className="mr-2 h-5 w-5" />
                       Derniers Devis
                    </h3>
                    {loading ? <p className="text-sm text-muted-foreground">Chargement...</p> : recentQuotes.length > 0 ? (
                    <ul className="space-y-3">
                        {recentQuotes.map(quote => (
                            <li key={quote.id} className="text-sm">
                                <div className="flex justify-between items-center">
                                    <div>
                                       <p><span className="font-medium">{quote.userName}</span></p>
                                       <p className="text-xs text-muted-foreground">Demandé le {quote.requestDate} - Statut: {quote.status}</p>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/admin/quotes/${quote.id}`}>
                                            Voir
                                            <ExternalLink className="ml-2 h-3 w-3" />
                                        </Link>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                     ) : (
                        <p className="text-sm text-muted-foreground">Aucune nouvelle demande de devis.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}   
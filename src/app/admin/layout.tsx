
"use client";

import * as React from "react"
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Utensils,
  LogOut,
  ChevronLeft,
  Calendar,
  Settings,
  Home,
  Image as ImageIcon,
  View,
  Edit,
  Mail,
  Trash2
} from "lucide-react"
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@/components/ui/sidebar"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Gestion Produits', icon: Utensils },
  { href: '/admin/gallery', label: 'Gestion Galerie', icon: ImageIcon },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/quotes', label: 'Devis', icon: ClipboardList },
  { href: '/admin/planning', label: 'Planning', icon: Calendar },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
]

const settingsNavItems = [
    { href: '/admin/homepage', label: 'Page d\'accueil', icon: Home },
    { href: '/admin/homepage-carousel', label: 'Ordre du Bandeau', icon: View },
    { href: '/admin/homepage-carousel/edit', label: 'Gérer les Images', icon: Edit },
    { href: '/admin/homepage-menus', label: 'Menus Points de Vente', icon: Utensils },
    { href: '/admin/settings', label: 'Paramètres Généraux', icon: Settings },
]

function AdminSidebar() {
    const pathname = usePathname();
    const { state, setOpen } = useSidebar();
    const [openSub, setOpenSub] = React.useState(false);

    return (
        <Sidebar>
            <SidebarHeader>
                <Button variant="ghost" className="h-10 w-full justify-start px-2">
                    <ChefHat className="h-8 w-8 text-primary" />
                    <div className="font-headline text-xl font-bold ml-2">Gourmand Menu</div>
                </Button>
            </SidebarHeader>
            <SidebarContent className="mt-4">
                <SidebarMenu>
                     <div className="px-2 py-1 mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">PRINCIPAL</p>
                    </div>
                    {adminNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} passHref>
                                <SidebarMenuButton isActive={pathname === item.href} tooltip={{ children: item.label }}>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                    
                    <Separator className="my-4" />

                     <div className="px-2 py-1 mb-2">
                        <p className="text-xs font-semibold text-muted-foreground">CONFIGURATION</p>
                    </div>
                     {settingsNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} passHref>
                                <SidebarMenuButton 
                                    isActive={pathname.startsWith(item.href) && (item.href !== '/admin/homepage-carousel' || pathname === '/admin/homepage-carousel')} 
                                    tooltip={{ children: item.label }}
                                >
                                    <item.icon />
                                    <span>{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                 <SidebarMenu>
                     <SidebarMenuItem>
                         <Link href="/" passHref>
                             <SidebarMenuButton tooltip={{ children: "Retour au site" }}>
                                 <ChevronLeft />
                                 <span>Retour au site</span>
                             </SidebarMenuButton>
                         </Link>
                     </SidebarMenuItem>
                 </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <div className="flex min-h-screen">
            <AdminSidebar />
            <div className="flex-1 overflow-auto">
                <header className="p-4 border-b flex justify-end md:hidden">
                    <SidebarTrigger />
                </header>
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    </SidebarProvider>
  )
}

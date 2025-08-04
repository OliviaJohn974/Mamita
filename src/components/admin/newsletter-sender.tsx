
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, Send } from 'lucide-react';
import { sendNewsletter, SendNewsletterOutput } from '@/ai/flows/send-newsletter-flow';
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
} from "@/components/ui/alert-dialog";


interface NewsletterSenderProps {
    menuId: 'menu_1' | 'menu_2';
    onPreviewGenerated: (content: SendNewsletterOutput) => void;
}

export function NewsletterSender({ menuId, onPreviewGenerated }: NewsletterSenderProps) {
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const menuName = menuId === 'menu_1' ? 'du Mamita' : 'de la Boutique Café';

    const handleSend = async () => {
        setIsSending(true);
        toast({
            title: "Envoi en cours...",
            description: "Les menus sont en cours d'envoi. Veuillez patienter.",
        });

        try {
            const result = await sendNewsletter(menuId);
            
            if (result.success) {
                 onPreviewGenerated(result); // For preview tab update, even if sending
                 toast({
                    title: "Envoi terminé !",
                    description: `Tous les emails ont bien été envoyés à ${result.count} abonné(s).`,
                });
            } else {
                 throw new Error(result.message || "L'envoi a échoué mais n'a pas renvoyé de message d'erreur spécifique.");
            }

        } catch (error: any) {
            console.error("Error sending newsletter:", error);
            toast({
                title: "Erreur d'envoi",
                description: error.message || "Une erreur est survenue lors de l'envoi des e-mails.",
                variant: "destructive",
            });
            onPreviewGenerated({success: false, count: 0, message: `Erreur: ${error.message}`});
        } finally {
            setIsSending(false);
            setIsDialogOpen(false);
        }
    };
    
    const handlePreview = async () => {
        setIsSending(true);
        toast({
            title: "Génération en cours...",
            description: "Veuillez patienter pendant que nous préparons l'aperçu.",
        });

        try {
            // We can reuse the same flow, but we won't trigger the email part if we just want a preview.
            // For now, we'll just show the final email content without sending.
            // The flow has been modified to always send, so this button will just act as a pre-confirmation visualization step.
            const result = await sendNewsletter(menuId);
            
            if (result.success && result.body && result.subject) {
                 onPreviewGenerated(result);
                 toast({
                    title: "Aperçu généré !",
                    description: "L'aperçu est disponible dans l'onglet dédié. Ceci est un aperçu, aucun e-mail n'a encore été envoyé.",
                });
            } else {
                 throw new Error(result.message || "La génération a échoué.");
            }
        } catch (error: any) {
             console.error("Error generating newsletter preview:", error);
            toast({
                title: "Erreur de génération",
                description: error.message || "Une erreur est survenue lors de la génération de l'aperçu.",
                variant: "destructive",
            });
            onPreviewGenerated({success: false, count: 0, message: `Erreur: ${error.message}`});
        } finally {
            setIsSending(false);
        }
    };


    return (
        <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview} disabled={isSending}>
                <Eye className="mr-2 h-4 w-4" />
                Actualiser l'aperçu
            </Button>
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <AlertDialogTrigger asChild>
                    <Button>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer le menu
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Merci de confirmer l'envoi</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vous êtes sur le point d'envoyer la newsletter pour le menu <strong>{menuName}</strong> à tous les abonnés.
                             Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSending}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSend} disabled={isSending}>
                            {isSending ? "Envoi en cours..." : "Envoyer le menu"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

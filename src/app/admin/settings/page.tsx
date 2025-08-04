
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from '@/components/ui/separator';

const GLOBAL_SETTINGS_DOC_ID = "global_settings";

interface GlobalSettings {
    minQuoteAmount?: number | string;
    startTime?: string;
    endTime?: string;
    timeSlotInterval?: number | string;
    facebookUrl?: string;
    instagramUrl?: string;
    contactUrl?: string;
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
      minQuoteAmount: '',
      startTime: '07:30',
      endTime: '18:00',
      timeSlotInterval: '30',
      facebookUrl: '',
      instagramUrl: '',
      contactUrl: '',
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const globalSettingsDocRef = doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID);
        const globalSnap = await getDoc(globalSettingsDocRef);

        if (globalSnap.exists()) {
          const data = globalSnap.data();
          setGlobalSettings({
              minQuoteAmount: data.minQuoteAmount || '',
              startTime: data.startTime || '07:30',
              endTime: data.endTime || '18:00',
              timeSlotInterval: data.timeSlotInterval || '30',
              facebookUrl: data.facebookUrl || '',
              instagramUrl: data.instagramUrl || '',
              contactUrl: data.contactUrl || '',
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({ title: "Erreur", description: "Impossible de charger les paramètres.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

    const handleGlobalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setGlobalSettings(prev => ({ ...prev, [id]: value }));
    };
    
  const handleSave = async () => {
    setIsSaving(true);
    const amount = parseFloat(globalSettings.minQuoteAmount as string);
    const interval = parseInt(globalSettings.timeSlotInterval as string, 10);

    let hasError = false;
    if (globalSettings.minQuoteAmount && (isNaN(amount) || amount < 0)) {
        toast({ title: "Valeur invalide", description: "Veuillez entrer un montant de devis valide.", variant: "destructive" });
        hasError = true;
    }
     if (globalSettings.timeSlotInterval && (isNaN(interval) || interval <= 0)) {
        toast({ title: "Valeur invalide", description: "Veuillez entrer un intervalle de temps valide.", variant: "destructive" });
        hasError = true;
    }

    if(hasError) {
        setIsSaving(false);
        return;
    }

    try {
      const globalSettingsToSave = {
        minQuoteAmount: amount || 0,
        startTime: globalSettings.startTime,
        endTime: globalSettings.endTime,
        timeSlotInterval: interval || 30,
        facebookUrl: globalSettings.facebookUrl,
        instagramUrl: globalSettings.instagramUrl,
        contactUrl: globalSettings.contactUrl,
      };
      
      const globalSettingsDocRef = doc(db, 'settings', GLOBAL_SETTINGS_DOC_ID);
      await setDoc(globalSettingsDocRef, globalSettingsToSave, { merge: true });
      
      toast({ title: "Succès", description: "Paramètres enregistrés." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Erreur", description: "Une erreur est survenue lors de l'enregistrement.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div>Chargement des paramètres...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-headline font-bold mb-6">Paramètres Généraux</h1>
      <div className="space-y-8">
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Réseaux Sociaux &amp; Contact</CardTitle>
                <CardDescription>Configurez les liens qui apparaissent dans le pied de page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="facebookUrl">Lien Facebook</Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={globalSettings.facebookUrl}
                  onChange={handleGlobalChange}
                  placeholder="https://facebook.com/votrepage"
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="instagramUrl">Lien Instagram</Label>
                <Input
                  id="instagramUrl"
                  type="url"
                  value={globalSettings.instagramUrl}
                  onChange={handleGlobalChange}
                  placeholder="https://instagram.com/votreprofil"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactUrl">Lien de Contact</Label>
                <Input
                  id="contactUrl"
                  type="text"
                  value={globalSettings.contactUrl}
                  onChange={handleGlobalChange}
                  placeholder="mailto:contact@votresite.com"
                />
              </div>
            </CardContent>
        </Card>
        
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Devis & Commandes</CardTitle>
            <CardDescription>Configurez les règles applicables aux demandes et aux retraits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minQuoteAmount">Montant minimum du devis (€)</Label>
              <Input
                id="minQuoteAmount"
                type="number"
                value={globalSettings.minQuoteAmount}
                onChange={handleGlobalChange}
                placeholder="Ex: 50"
              />
            </div>
            
            <Separator className="my-6" />

            <div>
              <h3 className="text-lg font-medium">Plage Horaire pour le retrait</h3>
              <p className="text-sm text-muted-foreground mb-4">Définissez les heures de disponibilité pour le retrait des commandes.</p>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label htmlFor="startTime">Heure de début</Label>
                      <Input id="startTime" type="time" value={globalSettings.startTime} onChange={handleGlobalChange} />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="endTime">Heure de fin</Label>
                      <Input id="endTime" type="time" value={globalSettings.endTime} onChange={handleGlobalChange} />
                  </div>
                   <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="timeSlotInterval">Intervalle (en minutes)</Label>
                      <Input id="timeSlotInterval" type="number" value={globalSettings.timeSlotInterval} onChange={handleGlobalChange} placeholder="Ex: 30" min="1"/>
                  </div>
               </div>
            </div>
            
            
          </CardContent>
        </Card>
      </div>
      
       <Button onClick={handleSave} disabled={isSaving} className="mt-6">
            {isSaving ? "Enregistrement..." : "Enregistrer tous les paramètres"}
          </Button>
    </div>
  );
}

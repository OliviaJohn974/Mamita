
'use server';
/**
 * @fileOverview Flow to send a newsletter to subscribers using Nodemailer.
 */

import { ai } from '@/ai/genkit';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
    SendNewsletterInputSchema, 
    SendNewsletterOutputSchema, 
    SendNewsletterInput, 
    SendNewsletterOutput,
    MenuData
} from './send-newsletter-types';
import { z } from 'genkit';
import nodemailer from 'nodemailer';

const EXTERNAL_SUBSCRIBERS_DOC_ID = "external_newsletter_subscribers";
const HOMEPAGE_TEXT_DOC_ID = "homepage_text";

export { type SendNewsletterOutput };

export async function sendNewsletter(input: SendNewsletterInput): Promise<SendNewsletterOutput> {
  return sendNewsletterFlow(input);
}

const sendNewsletterFlow = ai.defineFlow(
  {
    name: 'sendNewsletterFlow',
    inputSchema: SendNewsletterInputSchema,
    outputSchema: SendNewsletterOutputSchema,
  },
  async (menuId) => {
    
    // 1. Check for SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM_EMAIL) {
        throw new Error("La configuration SMTP est incomplète. Veuillez vérifier les variables d'environnement SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, et SMTP_FROM_EMAIL dans le fichier .env.");
    }

    // 2. Get Menu Content
    const menuContentDoc = await getDoc(doc(db, 'settings', HOMEPAGE_TEXT_DOC_ID));
    if (!menuContentDoc.exists()) {
        throw new Error("Homepage text settings not found.");
    }
    const allMenus = menuContentDoc.data().menus as MenuData[];
    const menuData = allMenus.find(m => m.id === menuId);
    if (!menuData) {
        throw new Error(`Menu data for ${menuId} not found.`);
    }

    // 3. Get Subscribers
    const userQueryField = menuId === 'menu_1' ? 'newsletterMamita' : 'newsletterBoutiqueCafe';
    const usersQuery = query(collection(db, "users"), where(userQueryField, "==", true));
    const userDocs = await getDocs(usersQuery);
    const registeredSubscribers = userDocs.docs.map(doc => doc.data().email as string);

    const externalSubscribersDoc = await getDoc(doc(db, 'settings', EXTERNAL_SUBSCRIBERS_DOC_ID));
    let externalSubscribers: string[] = [];
    if (externalSubscribersDoc.exists()) {
        const externalData = externalSubscribersDoc.data();
        const listKey = menuId === 'menu_1' ? 'mamita' : 'boutiqueCafe';
        externalSubscribers = externalData[listKey] || [];
    }

    const allSubscribers = [...new Set([...registeredSubscribers, ...externalSubscribers])];

    if (allSubscribers.length === 0) {
        return { success: true, count: 0, message: "Aucun abonné pour cette liste. Rien n'a été envoyé.", subject: "Aucun abonné", body: "" };
    }

    // 4. Generate Email Content with AI
    const menuDataForAI = JSON.parse(JSON.stringify(menuData));
    menuDataForAI.footerLines = menuDataForAI.footerLines.filter(
        (line: string) => !line.toLowerCase().includes('bon appétit')
    );
     
    const restaurantName = menuId === 'menu_1' ? 'Le Mamita' : 'La Boutique Café';

    const { output } = await ai.generate({
        prompt: `
            You are a helpful assistant for a French restaurant.
            Your task is to process the daily menu data provided in JSON format and output a subject line and the menu sections.
            The menu is for: ${menuData.date}.

            **Instructions:**
            1.  Create a compelling subject line. It must include the name of the restaurant "${restaurantName}", a hyphen, and then the date. Example: "${restaurantName} - Menu du {jour}".
            2.  For each section in the input data that is marked as \`isVisible: true\`, create a corresponding entry in the output.
            3.  List the items (the 'lines' array) for each visible section.
            4.  VERY IMPORTANT: For any line that contains a number that looks like a price (e.g., "8.00" or "8,00"), reformat it as text in the format "X€00" (e.g., "8€00"). Treat the price as text.

            Here is the data for the menu:
            ${JSON.stringify(menuDataForAI, null, 2)}
        `,
        model: 'googleai/gemini-1.5-flash-latest',
        output: {
            schema: z.object({
                subject: z.string(),
                sections: z.array(
                    z.object({
                        title: z.string(),
                        lines: z.array(z.string())
                    })
                )
            })
        }
    });

    if (!output) {
        throw new Error("Failed to generate email content.");
    }
    const { subject, sections } = output;
    
    const finalWish = `${restaurantName} vous souhaite un bon appétit !`;

    // 5. Construct the final HTML body using the generated content
    const body = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <style>
            body {
                margin: 0;
                padding: 0;
                background-color: #f8f8f8;
                font-family: 'PT Sans', sans-serif;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border: 1px solid #ddd;
                border-radius: 8px;
                overflow: hidden;
            }
            .header {
                padding: 20px;
                text-align: center;
            }
            .header img {
                max-width: 100px;
                margin: 0 auto 10px auto;
                display: block;
                border-radius: 50%;
            }
            .header-date {
                font-size: 1.2em;
                font-weight: bold;
                margin: 0;
                color: #333;
            }
            .content {
                padding: 30px;
            }
            .section {
                margin-bottom: 25px;
                text-align: center;
            }
            .section-title {
                font-family: 'Playfair Display', serif;
                font-size: 24px;
                margin-top: 0;
                margin-bottom: 15px;
                color: #251a08;
            }
            .section-items {
                list-style: none;
                padding: 0;
                margin: 0;
                color: #555;
            }
            .section-items li {
                margin-bottom: 8px;
                font-size: 16px;
            }
            .footer {
                padding: 20px;
                text-align: center;
                color: #888;
                font-size: 14px;
            }
            .footer-wish {
                font-family: 'Playfair Display', serif;
                font-weight: bold;
                font-size: 18px;
                color: #333;
                margin-bottom: 15px;
            }
            .footer-info {
                margin-top: 20px;
            }
            .footer-info li {
                list-style: none;
                margin-bottom: 5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                ${menuData.image ? `<img src="${menuData.image}" alt="Logo" style="width: 100px; max-width: 100px; margin: 0 auto 10px auto; display: block; border-radius: 50%;">` : ''}
                <p class="header-date">${menuData.date}</p>
            </div>
            <div class="content">
                ${sections.map(section => `
                    <div class="section">
                        <h2 class="section-title">${section.title}</h2>
                        <ul class="section-items">
                            ${section.lines.filter(line => line.trim() !== '').map(line => `<li>${line}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
            <div class="footer">
                <p class="footer-wish">${finalWish}</p>
                <div class="footer-info">
                    <ul style="padding: 0;">
                       ${menuData.footerLines.filter(line => line.trim() !== '' && !line.toLowerCase().includes('bon appétit')).map(line => `<li>${line}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
    
    // 6. Send Emails using Nodemailer
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT!),
        secure: parseInt(process.env.SMTP_PORT!) === 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: `"${restaurantName}" <${process.env.SMTP_FROM_EMAIL}>`,
            to: process.env.SMTP_FROM_EMAIL, // Send to self
            bcc: allSubscribers.join(', '), // Send to all subscribers in BCC
            subject: subject,
            html: body,
        });
    } catch (error: any) {
        console.error('Nodemailer Error:', error);
        throw new Error(`Erreur lors de l'envoi des e-mails via SMTP: ${error.message}`);
    }
    
    return {
      success: true,
      count: allSubscribers.length,
      message: `Tous les emails ont bien été envoyés à ${allSubscribers.length} abonné(s).`,
      subject,
      body,
    };
  }
);
    

    
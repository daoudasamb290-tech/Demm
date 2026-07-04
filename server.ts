import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Sending Booking Notification
  app.post("/api/send-booking-notification", async (req, res) => {
    try {
      const {
        id,
        reference,
        from,
        to,
        date,
        time,
        passengerName,
        phone,
        price,
        driverName,
        driverPhone,
        pickupAddress,
        seatsCount,
      } = req.body;

      if (!driverPhone) {
        return res.status(400).json({ error: "Le numéro de téléphone du chauffeur est requis." });
      }

      console.log(`[API] Processing booking notification for booking ref: ${reference || id}`);

      // 1. Generate summary using Gemini if available
      let messageText = "";
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: geminiApiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              }
            }
          });

          const prompt = `Génère un message WhatsApp destiné au chauffeur pour lui notifier sa nouvelle course. Tu dois impérativement respecter EXACTEMENT la structure suivante :

DEM – Nouvelle Course ! 🚗

Départ : ${from}

Arrivée : ${to}

Heure : ${time}

Client : ${passengerName || 'Client'}

👉 Réponds OUI pour accepter la course ou NON pour la refuser.

Ne mets aucune introduction, aucune salutation, aucun mot superflu en dehors de ce format exact.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
          });

          messageText = response.text || "";
        } catch (geminiError: any) {
          console.error("Error generating text with Gemini:", geminiError.message);
        }
      }

      // Fallback message text if Gemini was not configured or failed
      if (!messageText) {
        messageText = `DEM – Nouvelle Course ! 🚗\n\n` +
          `Départ : ${from}\n\n` +
          `Arrivée : ${to}\n\n` +
          `Heure : ${time}\n\n` +
          `Client : ${passengerName || 'Client'}\n\n` +
          `👉 Réponds OUI pour accepter la course ou NON pour la refuser.`;
      }

      // 2. Send via Twilio WhatsApp if configured
      const twilioSid = process.env.TWILIO_SID;
      const twilioToken = process.env.TWILIO_TOKEN;
      let sentViaTwilio = false;
      let twilioResponseId = null;
      let twilioWarning = null;

      if (twilioSid && twilioToken) {
        try {
          const client = twilio(twilioSid, twilioToken);
          // Standardise the driver's phone number to E.164 if needed, e.g., make sure it has +
          let cleanPhone = driverPhone.replace(/\s+/g, '');
          if (!cleanPhone.startsWith('+')) {
            if (cleanPhone.startsWith('77') || cleanPhone.startsWith('76') || cleanPhone.startsWith('78') || cleanPhone.startsWith('70')) {
              cleanPhone = `+221${cleanPhone}`;
            } else {
              cleanPhone = `+${cleanPhone}`;
            }
          }

          const message = await client.messages.create({
            body: messageText,
            from: 'whatsapp:+14155238886', // Twilio Sandbox WhatsApp number
            to: `whatsapp:${cleanPhone}`
          });

          sentViaTwilio = true;
          twilioResponseId = message.sid;
          console.log(`[API] WhatsApp message successfully dispatched via Twilio to ${cleanPhone}. Message SID: ${message.sid}`);
        } catch (twilioError: any) {
          console.error("Error sending WhatsApp message via Twilio:", twilioError.message);
          twilioWarning = `Erreur Twilio : ${twilioError.message}`;
        }
      } else {
        console.log("[API] Twilio credentials are not configured. Skipping actual WhatsApp dispatch.");
        twilioWarning = "Identifiants Twilio non configurés. Envoi WhatsApp simulé.";
      }

      return res.json({
        success: true,
        message: "Notification traitée avec succès.",
        generatedMessage: messageText,
        sentViaTwilio,
        twilioResponseId,
        warning: twilioWarning,
      });

    } catch (err: any) {
      console.error("Server notification handler error:", err);
      return res.status(500).json({ error: "Une erreur interne est survenue lors de l'envoi de la notification." });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

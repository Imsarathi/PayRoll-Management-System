import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// In-memory temporary PDF store for WhatsApp document attachments
const pdfStore = new Map<string, { data: Buffer; createdAt: number }>();

// Clean up PDFs older than 1 hour periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pdfStore.entries()) {
    if (now - value.createdAt > 3600000) {
      pdfStore.delete(key);
    }
  }
}, 600000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve generated PDFs to WhatsApp Meta Cloud / client
  app.get('/api/media/pdf/:fileId', (req, res) => {
    const item = pdfStore.get(req.params.fileId);
    if (!item) {
      return res.status(404).send('PDF not found or expired.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${req.params.fileId}"`);
    res.send(item.data);
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Meta WhatsApp test connection
  app.post('/api/whatsapp/test-connection', async (req, res) => {
    try {
      const phoneNumberId = req.body.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = req.body.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({ success: false, error: 'Phone Number ID and Access Token are required.' });
      }

      const cleanPhoneId = String(phoneNumberId).trim();
      const cleanToken = String(accessToken).trim();

      const response = await fetch(`https://graph.facebook.com/v21.0/${cleanPhoneId}`, {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });

      const data: any = await response.json();
      if (response.ok) {
        return res.json({
          success: true,
          phoneData: {
            verifiedName: data.verified_name || data.display_phone_number || 'Meta WhatsApp Account',
            displayPhoneNumber: data.display_phone_number || cleanPhoneId,
            qualityRating: data.quality_rating || 'GREEN',
          },
        });
      } else {
        const errorMsg = data.error?.message || 'Meta API verification failed.';
        let userFriendlyError = errorMsg;
        if (data.error?.code === 190) {
          userFriendlyError = 'Meta Access Token is invalid or expired. Please generate a Permanent System User Token in Meta Business Settings.';
        } else if (data.error?.code === 100) {
          userFriendlyError = `Invalid Phone Number ID (${cleanPhoneId}). Please verify your 15-digit Phone Number ID in developers.facebook.com.`;
        }
        return res.status(response.status).json({
          success: false,
          error: userFriendlyError,
          code: data.error?.code,
        });
      }
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: err.message || 'Meta API request failed.',
      });
    }
  });

  // Meta WhatsApp Send Payslip Document (.PDF) endpoint
  app.post('/api/whatsapp/send-payslip-pdf', async (req, res) => {
    try {
      const {
        phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessToken = process.env.WHATSAPP_ACCESS_TOKEN,
        to,
        message = '',
        pdfBase64,
        pdfFileName = 'Official_Payslip.pdf',
      } = req.body;

      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Meta Phone Number ID and Access Token are required. Please configure them in Settings.',
        });
      }

      if (!to) {
        return res.status(400).json({
          success: false,
          error: 'Recipient mobile number is required.',
        });
      }

      const cleanPhoneId = String(phoneNumberId).trim();
      const cleanToken = String(accessToken).trim();

      // Format recipient phone number for Meta Cloud API (strictly digits only, E.164 without '+')
      let cleanTo = String(to).replace(/\D/g, '');
      if (cleanTo.startsWith('0')) cleanTo = cleanTo.slice(1);
      // If 10-digit Indian phone number, prepend India country code 91
      if (cleanTo.length === 10) {
        cleanTo = `91${cleanTo}`;
      }

      let mediaId: string | null = null;
      let publicMediaUrl: string | null = null;

      // 1. If PDF base64 is provided, store it and attempt direct media upload to Meta Cloud API
      if (pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, 'base64');
          const fileId = `payslip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.pdf`;
          
          pdfStore.set(fileId, {
            data: pdfBuffer,
            createdAt: Date.now(),
          });

          const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
          const host = req.headers['x-forwarded-host'] || req.headers.host;
          publicMediaUrl = `${protocol}://${host}/api/media/pdf/${fileId}`;

          // Upload PDF directly to Meta Graph Media API
          const formData = new FormData();
          formData.append('messaging_product', 'whatsapp');
          const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
          formData.append('file', pdfBlob, pdfFileName);
          formData.append('type', 'application/pdf');

          const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${cleanPhoneId}/media`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            },
            body: formData,
          });

          const uploadData: any = await uploadRes.json();
          if (uploadRes.ok && uploadData.id) {
            mediaId = uploadData.id;
          } else {
            console.warn('Meta direct media upload note:', uploadData.error?.message || 'Will try document link/text fallback');
          }
        } catch (mediaErr) {
          console.warn('Media upload exception:', mediaErr);
        }
      }

      // Truncate message for caption if needed (Meta WhatsApp document caption limit is 1024 chars)
      const captionText = message.length > 1000 ? `${message.substring(0, 995)}...` : message;

      // 2. Build Meta WhatsApp message payload
      let messagePayload: any;

      if (mediaId) {
        // Send as native PDF document via Media ID
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'document',
          document: {
            id: mediaId,
            caption: captionText,
            filename: pdfFileName,
          },
        };
      } else if (publicMediaUrl) {
        // Send as native PDF document via hosted URL
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'document',
          document: {
            link: publicMediaUrl,
            caption: captionText,
            filename: pdfFileName,
          },
        };
      } else {
        // Fallback to text message
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            body: message,
            preview_url: false,
          },
        };
      }

      // 3. Dispatch to Meta Cloud API
      const sendRes = await fetch(`https://graph.facebook.com/v21.0/${cleanPhoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      const sendData: any = await sendRes.json();

      if (sendRes.ok && sendData.messages?.[0]?.id) {
        return res.json({
          success: true,
          messageId: sendData.messages[0].id,
          recipient: cleanTo,
          mode: mediaId || publicMediaUrl ? 'document' : 'text',
          pdfFileName,
        });
      }

      // 4. Detailed error diagnostics for Meta WhatsApp API
      const errorCode = sendData.error?.code;
      const errorMsg = sendData.error?.message || 'Meta WhatsApp dispatch failed.';
      let cleanError = errorMsg;

      if (errorCode === 131030 || String(errorMsg).includes('not in allowed list')) {
        cleanError = `Recipient (+${cleanTo}) is not verified in your Meta Sandbox Allowed List. In developers.facebook.com under 'Select phone numbers', click 'Manage phone number list' to add & verify +${cleanTo}, OR switch to 'Web Assist (Direct)'.`;
      } else if (errorCode === 131047 || String(errorMsg).includes('Re-engagement message') || String(errorMsg).includes('24 hours')) {
        cleanError = `WhatsApp 24-hour service window closed. The recipient (+${cleanTo}) must send a message (e.g. 'Hi') to your Meta test phone number first to open the 24-hour window, OR switch to 'Web Assist (Direct)' to send immediately.`;
      } else if (errorCode === 190) {
        cleanError = `Meta Access Token has expired or is invalid. Please generate a Permanent System User Token in Meta Business Settings.`;
      } else if (errorCode === 100) {
        cleanError = `Invalid WhatsApp Phone Number ID (${cleanPhoneId}) or recipient number format (+${cleanTo}).`;
      }

      return res.status(sendRes.status || 400).json({
        success: false,
        error: cleanError,
        code: errorCode,
      });
    } catch (err: any) {
      console.error('Meta WhatsApp dispatch exception:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Server error while dispatching via Meta WhatsApp API.',
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const OAuth2 = google.auth.OAuth2;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("work_confirmation", (data) => {
      console.log("Work confirmation received:", data);
      // Broadcast to all clients (including admins)
      io.emit("notification", {
        id: Math.random().toString(36).substr(2, 9),
        type: "work_confirmation",
        title: "Work Confirmed",
        message: `${data.employeeName} confirmed work for today`,
        timestamp: new Date().toISOString(),
        read: false,
        data: data
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Gmail API Route
  app.post("/api/gmail/send", async (req, res) => {
    const { subject, message, to } = req.body;

    const userEmail = process.env.GMAIL_USER_EMAIL;
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

    if (!userEmail || !clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({ 
        error: "Gmail configuration missing. Please set GMAIL_USER_EMAIL, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN in environment variables." 
      });
    }

    const oauth2Client = new OAuth2(
      clientId,
      clientSecret,
      "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    try {
      const accessTokenResponse = await oauth2Client.getAccessToken();
      const accessToken = accessTokenResponse.token;

      if (!accessToken) {
        throw new Error("Failed to generate access token");
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: userEmail,
          clientId: clientId,
          clientSecret: clientSecret,
          refreshToken: refreshToken,
          accessToken: accessToken
        }
      } as any);

      const mailOptions = {
        from: userEmail,
        to: to || "okerekelechukwu10@gmail.com, odera.okpala1@gmail.com",
        subject: subject || "PayPulse Notification",
        text: message
      };

      const result = await transporter.sendMail(mailOptions);
      res.json({ success: true, messageId: result.messageId });
    } catch (error: any) {
      console.error("Gmail Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp API Route
  app.post("/api/whatsapp/send", async (req, res) => {
    const { message, to } = req.body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ 
        error: "Twilio configuration missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment variables." 
      });
    }

    const client = twilio(accountSid, authToken);
    const targetNumber = to || process.env.ADMIN_PHONE_NUMBER || "+2348145398833"; // Use provided number, env var, or fallback
    
    // Ensure the number is in WhatsApp format
    const formattedTo = targetNumber.startsWith('whatsapp:') ? targetNumber : `whatsapp:${targetNumber}`;

    try {
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: formattedTo
      });
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("WhatsApp Send Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // SMS API Route
  app.post("/api/sms/send", async (req, res) => {
    const { message, to } = req.body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_SMS_FROM; // e.g., '+1234567890'

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ 
        error: "Twilio configuration missing. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_FROM in environment variables." 
      });
    }

    const client = twilio(accountSid, authToken);
    const targetNumber = to || process.env.ADMIN_PHONE_NUMBER || "+2348145398833"; // Use provided number, env var, or fallback

    try {
      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: targetNumber
      });
      res.json({ success: true, sid: result.sid });
    } catch (error: any) {
      console.error("SMS Send Error:", error);
      res.status(500).json({ error: error.message });
    }
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram Reporting Endpoint
  app.post("/api/report", async (req, res) => {
    const { content, authorName, authorUid, reporterName, reporterUid, type, reason } = req.body;
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error("Telegram credentials missing");
      return res.status(500).json({ error: "Reporting system misconfigured" });
    }

    const message = `
🚨 *New Report Received* 🚨
*Type:* ${type}
*Reason:* ${reason}

*Reported Content:*
"${content}"

*Author:* ${authorName} (${authorUid})
*Reporter:* ${reporterName} (${reporterUid})
    `;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      });

      if (response.ok) {
        res.json({ success: true });
      } else {
        const errData = await response.json();
        console.error("Telegram API error:", errData);
        res.status(500).json({ error: "Failed to send report to Telegram" });
      }
    } catch (error) {
      console.error("Reporting error:", error);
      res.status(500).json({ error: "Internal server error during reporting" });
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
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { syncDB } from "./models/index.js";
import apiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Allows frontend to communicate with backend
app.use(express.json()); // Parses incoming JSON requests

// Connect Database
connectDB().then(() => {
  // Sync schemas automatically
  syncDB();
});

// Mount Routes
app.use("/api", apiRoutes);

// Health Check Route
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Backend is running" });
});

// Start Server
const startServer = (port) => {
  const server = app.listen(port, () => {
    const address = server.address();
    const actualPort =
      typeof address === "object" && address ? address.port : port;

    console.log(`🚀 Server running on http://localhost:${actualPort}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port === 0 ? 0 : port + 1;
      console.warn(`⚠️ Port ${port} is busy, trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    console.error("❌ Server failed to start:", error);
    process.exit(1);
  });
};

startServer(Number(PORT));

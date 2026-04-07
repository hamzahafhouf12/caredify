const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const statusMap = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

/**
 * @route GET /api/health
 * @desc Check the status of the server and database connection
 */
router.get("/", (_req, res) => {
  const readyState = mongoose.connection.readyState;

  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: {
      status: statusMap[readyState] || "unknown",
      readyState
    },
    timestamp: new Date()
  });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

/**
 * @route GET /api/messages/conversations
 * @desc  Get list of unique patients/conversations for the doctor
 */
router.get("/conversations", protect, doctor, async (req, res, next) => {
  try {
    const medecinId = req.user._id;

    // Aggregate unique patients that have exchanged messages with this doctor
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ expediteur: medecinId }, { destinataire: medecinId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$patient",
          lastMessage: { $first: "$contenu" },
          lastDate: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$destinataire", medecinId] },
                    { $eq: ["$lue", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "patients",
          localField: "_id",
          foreignField: "_id",
          as: "patientInfo",
        },
      },
      { $unwind: "$patientInfo" },
      { $sort: { lastDate: -1 } },
    ]);

    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/messages/:patientId
 * @desc  Get chat history with a specific patient
 */
router.get("/:patientId", protect, doctor, async (req, res, next) => {
  try {
    const medecinId = req.user._id;
    const { patientId } = req.params;

    const messages = await Message.find({
      patient: patientId,
      $or: [{ expediteur: medecinId }, { destinataire: medecinId }],
    })
      .sort({ createdAt: 1 })
      .populate("expediteur", "nom prenom role")
      .populate("destinataire", "nom prenom role");

    // Mark as read
    await Message.updateMany(
      { destinataire: medecinId, patient: patientId, lue: false },
      { $set: { lue: true } }
    );

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

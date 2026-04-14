const express = require("express");
const router = express.Router();
const Prescription = require("../models/Prescription");
const Patient = require("../models/Patient");
const { protect, doctor } = require("../middleware/authMiddleware");

router.use(protect, doctor);

/**
 * @route POST /api/prescriptions
 * @desc  Create a new prescription
 */
router.post("/", async (req, res, next) => {
  try {
    const { patientId, medicaments, notes, ecgRecord } = req.body;

    if (!patientId || !medicaments || medicaments.length === 0) {
      const err = new Error("patientId and at least one medicament are required");
      err.statusCode = 400;
      return next(err);
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      const err = new Error("Patient not found");
      err.statusCode = 404;
      return next(err);
    }

    const prescription = await Prescription.create({
      patient: patientId,
      medecin: req.user._id,
      medicaments,
      notes: notes || "",
      ecgRecord: ecgRecord || null,
    });

    res.status(201).json(prescription);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/prescriptions/patient/:patientId
 * @desc  Get all prescriptions for a patient
 */
router.get("/patient/:patientId", async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate("medecin", "nom prenom")
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/prescriptions/:id/statut
 * @desc  Update prescription status
 */
router.put("/:id/statut", async (req, res, next) => {
  try {
    const { statut } = req.body;

    if (!["active", "terminée", "annulée"].includes(statut)) {
      const err = new Error("Invalid status value");
      err.statusCode = 400;
      return next(err);
    }

    const prescription = await Prescription.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );

    if (!prescription) {
      const err = new Error("Prescription not found");
      err.statusCode = 404;
      return next(err);
    }

    res.json(prescription);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/prescriptions/:id/export/pdf
 * @desc  Export prescription as PDF
 */
router.get("/:id/export/pdf", async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "nom prenom age cin groupeSanguin")
      .populate("medecin", "nom prenom");

    if (!prescription) {
      const err = new Error("Prescription not found");
      err.statusCode = 404;
      return next(err);
    }

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Ordonnance_${prescription.patient.cin}_${Date.now()}.pdf`
    );

    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Caredify — Ordonnance Médicale", { align: "center" });
    doc.moveDown();

    // Doctor & Patient info
    doc.fontSize(12)
      .text(`Médecin : Dr. ${prescription.medecin.prenom} ${prescription.medecin.nom}`)
      .text(`Date : ${new Date(prescription.createdAt).toLocaleDateString("fr-FR")}`)
      .moveDown()
      .text(`Patient : ${prescription.patient.prenom} ${prescription.patient.nom}`)
      .text(`CIN : ${prescription.patient.cin}`)
      .text(`Âge : ${prescription.patient.age} ans`)
      .moveDown();

    // Medications
    doc.fontSize(14).text("Médicaments prescrits :", { underline: true });
    doc.fontSize(11);
    prescription.medicaments.forEach((med, i) => {
      doc.moveDown(0.5)
        .text(`${i + 1}. ${med.nom}`)
        .text(`   Posologie : ${med.posologie}`)
        .text(`   Durée : ${med.duree}`)
        .text(`   Instructions : ${med.instructions || "—"}`);
    });

    // Notes
    if (prescription.notes) {
      doc.moveDown().fontSize(14).text("Notes :", { underline: true });
      doc.fontSize(11).text(prescription.notes);
    }

    doc.moveDown(2)
      .fontSize(10).fillColor("gray")
      .text("© Caredify — Document médical confidentiel", { align: "center" });

    doc.end();

    // Mark PDF as exported
    await Prescription.findByIdAndUpdate(req.params.id, { "exports.pdf": true });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/prescriptions/:id/export/hl7
 * @desc  Export prescription as HL7 JSON structure
 */
router.get("/:id/export/hl7", async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("patient", "nom prenom age cin")
      .populate("medecin", "nom prenom");

    if (!prescription) {
      const err = new Error("Prescription not found");
      err.statusCode = 404;
      return next(err);
    }

    // Basic HL7 FHIR-like structure
    const hl7 = {
      resourceType: "MedicationRequest",
      id: prescription._id,
      status: prescription.statut === "active" ? "active" : "completed",
      intent: "order",
      subject: {
        reference: `Patient/${prescription.patient._id}`,
        display: `${prescription.patient.prenom} ${prescription.patient.nom}`,
      },
      requester: {
        reference: `Practitioner/${prescription.medecin._id}`,
        display: `Dr. ${prescription.medecin.prenom} ${prescription.medecin.nom}`,
      },
      authoredOn: prescription.createdAt,
      note: prescription.notes ? [{ text: prescription.notes }] : [],
      medicationCodeableConcept: prescription.medicaments.map((med) => ({
        text: med.nom,
        dosageInstruction: [
          {
            text: med.posologie,
            timing: { repeat: { duration: med.duree } },
            additionalInstruction: med.instructions
              ? [{ text: med.instructions }]
              : [],
          },
        ],
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=HL7_${prescription.patient.cin}_${Date.now()}.json`
    );

    // Mark HL7 as exported
    await Prescription.findByIdAndUpdate(req.params.id, { "exports.hl7": true });

    res.json(hl7);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
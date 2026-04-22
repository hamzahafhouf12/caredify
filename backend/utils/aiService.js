/**
 * aiService.js — Pont Node.js ↔ Micro-service Python IA
 * =========================================================
 * Appelle le serveur FastAPI Python (port 8000) pour analyser un signal ECG.
 * Retry automatique + fallback sur simulation locale si le service est indisponible.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const MAX_RETRIES    = 2;
const TIMEOUT_MS     = 8000; // 8 secondes max

/**
 * Analyse un signal ECG via le micro-service Python IA.
 * @param {number[]} signalData - Tableau de valeurs float (signal ECG brut)
 * @param {number}   sampleRate - Fréquence d'échantillonnage (Hz), défaut 250
 * @returns {Promise<object>} iaInterpretations compatible avec le schéma ECGRecord
 */
async function analyzeECG(signalData, sampleRate = 250) {
  // Si signal vide ou trop court → retour minimal
  if (!signalData || signalData.length < 50) {
    console.warn("[aiService] Signal trop court, analyse ignorée.");
    return buildFallbackResult();
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller  = new AbortController();
      const timeoutId   = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signal:      signalData,
          sample_rate: sampleRate,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI Service HTTP ${response.status}: ${errText}`);
      }

      const result = await response.json();
      console.log(`[aiService] ✅ Analyse IA réussie (mode=${result.mode}) | Classe=${result.classe} | Score=${result.score_risque}`);

      return mapAIResultToSchema(result);

    } catch (err) {
      if (err.name === "AbortError") {
        console.warn(`[aiService] ⏱️ Timeout sur tentative ${attempt}/${MAX_RETRIES}`);
      } else {
        console.warn(`[aiService] ⚠️ Erreur tentative ${attempt}/${MAX_RETRIES}: ${err.message}`);
      }

      if (attempt === MAX_RETRIES) {
        console.warn("[aiService] 🔄 Fallback sur simulation locale.");
        return buildFallbackResult(signalData);
      }
      // Attendre 500ms avant retry
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

/**
 * Mappe le résultat du service Python vers le schéma iaInterpretations de MongoDB.
 */
function mapAIResultToSchema(result) {
  const probas       = result.probas || {};
  const anomalies    = result.anomalies || {};
  const scoreRisque  = result.score_risque || 0;
  const classe       = (result.classe || "Normal").toUpperCase();

  return {
    // Flags booléens (compatibles frontend)
    arythmie:                anomalies.arythmie              || false,
    fibrillationAuriculaire: anomalies.fibrillationAuriculaire || false,
    tachycardie:             anomalies.tachycardie            || false,
    bradycardie:             anomalies.bradycardie            || false,
    anomalieST:              anomalies.anomalieST             || false,
    hrvFaible:               false,
    insuffisanceCardiaque:   false,

    // Score et résumé
    scoreRisque,
    resumeIA: result.resume_ia || "Analyse IA effectuée.",

    // Classification détaillée (probabilités)
    detailedClassification: {
      normal:       probas.normal       || 0,
      pvc:          probas.pvc          || 0,
      sveb:         probas.sveb         || 0,
      fusion:       probas.fusion       || 0,
      unclassified: probas.unclassified || 0,
    },

    // Heatmap XAI (Grad-CAM)
    xaiHeatmap: result.heatmap || [],
  };
}

/**
 * Résultat de fallback utilisé si le service IA est indisponible.
 * Analyse basique au niveau du signal (écart-type, amplitude).
 */
function buildFallbackResult(signalData = []) {
  let score = 10;
  let resumeIA = "✅ Rythme sinusal normal (analyse locale - service IA indisponible).";
  let arythmie = false, tachycardie = false;

  if (signalData.length > 50) {
    const arr = signalData.slice(0, 500);
    const mean  = arr.reduce((a, b) => a + b, 0) / arr.length;
    const std   = Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length);
    const peaks = arr.filter(v => v > mean + 1.5 * std).length;

    // Estimation grossière basée sur la variance
    if (std > 0.4) {
      score = 55;
      arythmie = true;
      resumeIA = "⚠️ Variabilité élevée du signal détectée. Revue manuelle recommandée.";
    }
    if (peaks > arr.length * 0.05) {
      tachycardie = true;
      score = Math.max(score, 42);
    }
  }

  return {
    arythmie,
    fibrillationAuriculaire: false,
    tachycardie,
    bradycardie:             false,
    anomalieST:              false,
    hrvFaible:               false,
    insuffisanceCardiaque:   false,
    scoreRisque: score,
    resumeIA,
    detailedClassification: {
      normal:       score < 40 ? 0.88 : 0.3,
      pvc:          score >= 70 ? 0.55 : 0.05,
      sveb:         0.04,
      fusion:       0.02,
      unclassified: 0.01,
    },
    xaiHeatmap: [],
  };
}

/**
 * Vérifie si le service IA est disponible.
 */
async function checkHealth() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  }
}

module.exports = { analyzeECG, checkHealth };

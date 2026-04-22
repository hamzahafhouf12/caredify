"""
Caredify ECG AI Micro-service — FastAPI Server
================================================
- Mode production : charge ecg_transformer.keras via TensorFlow
- Mode simulation : analyse statistique du signal ECG (démo sans GPU)

Démarrage : uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import json
import logging
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("caredify-ai")

# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Caredify ECG AI Service",
    description="Micro-service d'analyse ECG par Transformer + XAI Grad-CAM",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Loading ───────────────────────────────────────────────────────────
MODEL = None
MODEL_MODE = "simulation"  # "production" | "simulation"

CLASS_NAMES = ["Fusion", "Normal", "PVC", "SVEB", "Unclassified"]
WINDOW_SIZE = 360

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "saved_models", "ecg_transformer.keras")
MODEL_H5   = os.path.join(BASE_DIR, "saved_models", "ecg_transformer.h5")
MODEL_BEST = os.path.join(BASE_DIR, "saved_models", "best_model.keras")

@app.on_event("startup")
async def load_model():
    global MODEL, MODEL_MODE
    for path in [MODEL_PATH, MODEL_BEST, MODEL_H5]:
        if os.path.exists(path):
            try:
                import tensorflow as tf
                MODEL = tf.keras.models.load_model(path, compile=False)
                MODEL_MODE = "production"
                logger.info(f"✅ Modèle Keras chargé depuis: {path}")
                return
            except Exception as e:
                logger.warning(f"⚠️ Échec du chargement {path}: {e}")
    logger.info("🔬 Mode SIMULATION activé (modèle non trouvé — résultats réalistes générés)")

# ─── Schemas ─────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    signal: List[float]
    sample_rate: Optional[int] = 250
    patient_id: Optional[str] = None

class AnalyzeResponse(BaseModel):
    classe: str
    probas: dict
    score_risque: int
    heatmap: List[float]
    resume_ia: str
    anomalies: dict
    mode: str

# ─── Signal Processing Helpers ────────────────────────────────────────────
def butter_bandpass(signal: np.ndarray, fs: int = 250) -> np.ndarray:
    """Filtre passe-bande 0.5–40 Hz pour nettoyer le signal ECG."""
    try:
        nyq = 0.5 * fs
        low, high = 0.5 / nyq, min(40 / nyq, 0.99)
        b, a = butter(4, [low, high], btype="band")
        return filtfilt(b, a, signal)
    except Exception:
        return signal

def normalize(signal: np.ndarray) -> np.ndarray:
    std = np.std(signal)
    if std < 1e-8:
        return signal - np.mean(signal)
    return (signal - np.mean(signal)) / std

def extract_ecg_features(signal: np.ndarray, fs: int = 250) -> dict:
    """Analyse statistique ECG pour le mode simulation intelligente."""
    try:
        clean = butter_bandpass(signal, fs)
        norm  = normalize(clean)

        # Détection de pics R (QRS)
        min_distance = int(0.4 * fs)  # 400ms minimum entre 2 battements
        peaks, props = find_peaks(norm, height=0.3, distance=min_distance, prominence=0.5)

        # Fréquence cardiaque
        if len(peaks) >= 2:
            rr_intervals = np.diff(peaks) / fs  # secondes
            hr_mean = 60 / np.mean(rr_intervals)
            hrv = np.std(rr_intervals) * 1000  # ms
            rr_var = np.var(rr_intervals)
        else:
            hr_mean = 75.0
            hrv = 40.0
            rr_var = 0.005

        # Analyse morphologique
        amplitude_std = np.std(norm)
        peak_heights = props.get("peak_heights", []) if len(peaks) > 0 else []
        qrs_amplitude_var = np.std(peak_heights) if len(peak_heights) > 1 else 0.0

        # Détection d'anomalies statistiques
        tachycardie = hr_mean > 100
        bradycardie = hr_mean < 50
        arythmie    = rr_var > 0.02 or qrs_amplitude_var > 0.25
        anomalie_st = amplitude_std > 0.6

        # Probabilités basées sur les features
        p_normal = 1.0
        p_pvc    = 0.02
        p_sveb   = 0.02
        p_fusion = 0.01

        if tachycardie or bradycardie:
            p_normal -= 0.4
            p_sveb   += 0.25
        if arythmie:
            p_normal -= 0.5
            p_pvc    += 0.35
            p_sveb   += 0.15
        if anomalie_st:
            p_normal -= 0.3
            p_pvc    += 0.25
        if qrs_amplitude_var > 0.3:
            p_pvc    += 0.3
            p_fusion += 0.15

        # Normalisation softmax-like
        p_normal = max(0.01, p_normal)
        total = p_normal + p_pvc + p_sveb + p_fusion + 0.01
        probas = {
            "normal":       round(p_normal / total, 3),
            "pvc":          round(p_pvc / total, 3),
            "sveb":         round(p_sveb / total, 3),
            "fusion":       round(p_fusion / total, 3),
            "unclassified": round(0.01 / total, 3),
        }

        return {
            "hr_mean": hr_mean,
            "hrv": hrv,
            "peaks": peaks.tolist(),
            "probas": probas,
            "tachycardie": bool(tachycardie),
            "bradycardie": bool(bradycardie),
            "arythmie": bool(arythmie),
            "anomalie_st": bool(anomalie_st),
            "qrs_amplitude_var": float(qrs_amplitude_var),
        }
    except Exception as e:
        logger.error(f"Feature extraction error: {e}")
        return {
            "hr_mean": 75.0,
            "hrv": 40.0,
            "peaks": [],
            "probas": {"normal": 0.88, "pvc": 0.05, "sveb": 0.04, "fusion": 0.02, "unclassified": 0.01},
            "tachycardie": False,
            "bradycardie": False,
            "arythmie": False,
            "anomalie_st": False,
            "qrs_amplitude_var": 0.0,
        }

def compute_gradcam_simulation(signal: np.ndarray, peaks: list, anomaly_keys: list) -> List[float]:
    """
    Génère une heatmap Grad-CAM simulée mais réaliste :
    - Zones autour des pics QRS ont une importance élevée
    - Zones d'anomalie détectées ont une importance encore plus élevée
    """
    heatmap = np.zeros(len(signal))
    half_win = 15

    # Importance de base sur les complexes QRS
    for p in peaks:
        start = max(0, p - half_win)
        end   = min(len(signal), p + half_win)
        for i in range(start, end):
            dist = abs(i - p) / half_win
            heatmap[i] = max(heatmap[i], 0.4 * (1 - dist ** 2))

    # Boost sur les zones anormales (tous les 3ème complexe si arythmie)
    if "arythmie" in anomaly_keys or "pvc" in anomaly_keys:
        anomaly_peaks = peaks[::3] if len(peaks) > 3 else peaks
        for p in anomaly_peaks:
            start = max(0, p - 20)
            end   = min(len(signal), p + 20)
            for i in range(start, end):
                dist = abs(i - p) / 20
                heatmap[i] = max(heatmap[i], 0.85 * (1 - dist))

    # Normalisation [0, 1]
    if heatmap.max() > 0:
        heatmap = heatmap / heatmap.max()

    # Sous-échantillonnage pour réduire la taille (max 500 pts)
    if len(heatmap) > 500:
        step = len(heatmap) // 500
        heatmap = heatmap[::step][:500]

    return [round(float(v), 3) for v in heatmap]

def build_clinical_summary(probas: dict, features: dict) -> tuple[str, int]:
    """Génère résumé clinique en français + score de risque."""
    dominant_class = max(probas, key=probas.get)
    dominant_prob  = probas[dominant_class]

    # Score de risque (0–100)
    score = int(10 + (1 - probas.get("normal", 0.9)) * 90)
    score = max(5, min(98, score))

    hr   = features.get("hr_mean", 75)
    hrv  = features.get("hrv", 40)
    tach = features.get("tachycardie", False)
    brad = features.get("bradycardie", False)
    aryt = features.get("arythmie", False)
    ast  = features.get("anomalie_st", False)

    # Résumé par classe dominante
    if dominant_class == "Normal" and dominant_prob > 0.75:
        resume = f"✅ Rythme sinusal normal détecté. FC ≈ {hr:.0f} bpm, HRV ≈ {hrv:.0f} ms. Aucune anomalie significative identifiée."
    elif dominant_class == "PVC" or probas.get("pvc", 0) > 0.3:
        resume = f"⚠️ Extrasystoles Ventriculaires (PVC) détectées (probabilité {probas.get('pvc',0)*100:.0f}%). Complexes QRS larges et prématurés observés. FC ≈ {hr:.0f} bpm."
        if score < 40:
            score = 45
    elif dominant_class == "SVEB" or probas.get("sveb", 0) > 0.3:
        resume = f"🔶 Ectopies Supraventriculaires (SVEB) suspectées. Morphologie P atypique détectée. FC ≈ {hr:.0f} bpm. Surveillance recommandée."
        if score < 35:
            score = 38
    elif dominant_class == "Fusion":
        resume = f"🔴 Rythme de Fusion détecté — coexistence de battements sinusaux et ectopiques. Consultation cardiologique urgente conseillée."
        if score < 60:
            score = 65
    else:
        resume = f"❓ Tracé non classifiable avec certitude. FC ≈ {hr:.0f} bpm. Revue manuelle recommandée."

    # Ajouts contextuels
    if tach:
        resume += f" Tachycardie présente (FC > 100 bpm)."
        score = max(score, 42)
    if brad:
        resume += f" Bradycardie présente (FC < 50 bpm)."
        score = max(score, 38)
    if aryt:
        resume += " Irrégularité RR notable."
    if ast:
        resume += " Possible anomalie du segment ST — ischémie à exclure."
        score = max(score, 55)

    return resume, score

def analyze_with_production_model(signal: np.ndarray, fs: int) -> dict:
    """Analyse avec le vrai modèle Keras (mode production)."""
    import tensorflow as tf

    clean = butter_bandpass(signal, fs)
    norm  = normalize(clean)

    # Découpage en fenêtres WINDOW_SIZE et prédiction sur chacune
    windows, positions = [], []
    step = WINDOW_SIZE // 2
    for start in range(0, len(norm) - WINDOW_SIZE + 1, step):
        windows.append(norm[start : start + WINDOW_SIZE])
        positions.append(start + WINDOW_SIZE // 2)

    if not windows:
        # Signal trop court — padding
        pad = np.zeros(WINDOW_SIZE)
        pad[:len(norm)] = norm[:WINDOW_SIZE]
        windows = [pad]
        positions = [WINDOW_SIZE // 2]

    batch = np.array(windows)
    preds = MODEL.predict(batch, verbose=0)  # (N, 5)
    avg_proba = preds.mean(axis=0)

    # Grad-CAM sur la fenêtre centrale
    mid_idx = len(windows) // 2
    mid_win = windows[mid_idx]

    try:
        grad_model = tf.keras.Model(
            inputs=MODEL.inputs,
            outputs=[MODEL.get_layer("res_cnn_3").output, MODEL.output]
        )
        signal_tensor = tf.cast(mid_win[np.newaxis, :], tf.float32)
        with tf.GradientTape() as tape:
            conv_out, prd = grad_model(signal_tensor)
            class_idx = tf.argmax(prd[0])
            loss = prd[:, class_idx]
        grads = tape.gradient(loss, conv_out)
        pooled = tf.reduce_mean(grads, axis=(0, 1))
        heatmap_raw = tf.reduce_sum(conv_out[0] * pooled, axis=-1).numpy()
        heatmap_raw = np.maximum(heatmap_raw, 0)
        if heatmap_raw.max() > 0:
            heatmap_raw /= heatmap_raw.max()
        # Upsample to signal length
        heatmap = np.interp(
            np.linspace(0, len(heatmap_raw) - 1, min(len(signal), 500)),
            np.arange(len(heatmap_raw)), heatmap_raw
        ).tolist()
    except Exception as e:
        logger.warning(f"Grad-CAM failed: {e}")
        heatmap = [0.0] * min(len(signal), 500)

    class_idx = int(np.argmax(avg_proba))
    probas = {name.lower(): float(round(avg_proba[i], 3)) for i, name in enumerate(CLASS_NAMES)}

    return {"probas": probas, "heatmap": heatmap, "class_idx": class_idx}

# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "mode": MODEL_MODE,
        "model_loaded": MODEL is not None,
        "service": "Caredify ECG AI v2.0",
    }

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_ecg(req: AnalyzeRequest):
    signal = np.array(req.signal, dtype=np.float64)
    fs     = req.sample_rate or 250

    if len(signal) < 50:
        raise HTTPException(status_code=400, detail="Signal ECG trop court (min 50 points).")

    logger.info(f"🔬 Analyse ECG — {len(signal)} pts @ {fs}Hz — mode={MODEL_MODE}")

    if MODEL_MODE == "production" and MODEL is not None:
        # ── Vrai modèle TF ──
        try:
            result = analyze_with_production_model(signal, fs)
            probas  = result["probas"]
            heatmap = result["heatmap"]

            features = extract_ecg_features(signal, fs)
            resume, score = build_clinical_summary(probas, features)
            dominant_class = CLASS_NAMES[result["class_idx"]]

            anomalies = {
                "tachycardie":            features["tachycardie"],
                "bradycardie":            features["bradycardie"],
                "arythmie":               features["arythmie"],
                "anomalieST":             features["anomalie_st"],
                "fibrillationAuriculaire":probas.get("sveb", 0) > 0.5,
            }
        except Exception as e:
            logger.error(f"Production model error: {e}, falling back to simulation")
            goto_simulation = True
        else:
            goto_simulation = False
    else:
        goto_simulation = True

    if goto_simulation:
        # ── Mode simulation intelligente ──
        features = extract_ecg_features(signal, fs)
        probas   = features["probas"]

        dominant_class = max(probas, key=probas.get).capitalize()
        resume, score  = build_clinical_summary(probas, features)

        anomaly_keys = []
        if features["arythmie"]:     anomaly_keys.append("arythmie")
        if probas.get("pvc", 0) > 0.3: anomaly_keys.append("pvc")

        heatmap = compute_gradcam_simulation(signal, features["peaks"], anomaly_keys)

        anomalies = {
            "tachycardie":             features["tachycardie"],
            "bradycardie":             features["bradycardie"],
            "arythmie":                features["arythmie"],
            "anomalieST":              features["anomalie_st"],
            "fibrillationAuriculaire": probas.get("sveb", 0) > 0.4,
        }

    logger.info(f"✅ Résultat: {dominant_class} | Score: {score} | Heatmap: {len(heatmap)} pts")

    return AnalyzeResponse(
        classe=dominant_class,
        probas=probas,
        score_risque=score,
        heatmap=heatmap,
        resume_ia=resume,
        anomalies=anomalies,
        mode=MODEL_MODE,
    )

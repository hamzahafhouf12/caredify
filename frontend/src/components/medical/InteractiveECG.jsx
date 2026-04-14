import React, { useRef, useEffect, useState, useMemo } from "react";
import "./InteractiveECG.css";

/**
 * Composant ECG Interactif Haute Performance
 * Supporte : Temps Réel, Multi-Leads, Annotations IA
 */
const InteractiveECG = ({
  points = [],
  leads = [],
  annotations = [],
  temporalAnnotations = [], // [{ startTime: 0.5, endTime: 1.2, note: "Anomalie" }]
  onAddTemporalAnnotation = null,
  sampleRate = 250,
  height = 300,
  isLive = false,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);

  // Annotation period states
  const [mode, setMode] = useState("pan"); // 'pan' | 'annotate'
  const [selectionStartPx, setSelectionStartPx] = useState(null);
  const [selectionEndPx, setSelectionEndPx] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [noteInput, setNoteInput] = useState("");

  const mmToPx = 3.78;
  const largeSquarePx = 5 * mmToPx;
  const smallSquarePx = mmToPx;
  const pxPerSecond = 25 * mmToPx * zoom;

  // Calculer la largeur du signal principal ou du premier lead
  const mainData = leads.length > 0 ? leads[0].data : points;
  const totalDuration = mainData.length / sampleRate;
  const totalWidth = pxPerSecond * totalDuration;

  // Auto-scroll en mode Live
  useEffect(() => {
    if (isLive && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      if (totalWidth > containerWidth) {
        setOffsetX(-(totalWidth - containerWidth + 20)); // Garder une marge à droite
      }
    }
  }, [mainData.length, isLive, totalWidth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const container = containerRef.current;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, rect.width, height);
      drawGrid(ctx, rect.width, height, offsetX);

      // Dessiner les leads (superposition)
      if (leads.length > 0) {
        leads.forEach((lead, idx) => {
          drawSignal(
            ctx,
            rect.width,
            height,
            lead.data,
            (sr) => sr,
            pxPerSecond,
            offsetX,
            lead.color || "#2f80ed",
            idx * 20,
          );
        });
      } else {
        drawSignal(
          ctx,
          rect.width,
          height,
          points,
          (sr) => sr,
          pxPerSecond,
          offsetX,
          "#2f80ed",
        );
      }

      // Dessiner les annotations temporelles
      drawTemporalAnnotations(
        ctx,
        rect.width,
        height,
        temporalAnnotations,
        pxPerSecond,
        offsetX,
      );

      // Dessiner la sélection en cours
      if (
        mode === "annotate" &&
        selectionStartPx !== null &&
        selectionEndPx !== null
      ) {
        drawSelection(ctx, selectionStartPx, selectionEndPx, height);
      }

      // Dessiner les annotations (peaks ML)
      drawAnnotations(
        ctx,
        rect.width,
        height,
        annotations,
        sampleRate,
        pxPerSecond,
        offsetX,
      );
    };

    draw();
  }, [
    points,
    leads,
    annotations,
    temporalAnnotations,
    sampleRate,
    zoom,
    offsetX,
    height,
    isLive,
    mode,
    selectionStartPx,
    selectionEndPx,
  ]);

  const drawGrid = (ctx, width, height, offset) => {
    const gridOffset = offset % largeSquarePx;
    ctx.beginPath();
    ctx.strokeStyle = "#fdefef";
    ctx.lineWidth = 0.5;
    for (let x = gridOffset; x < width; x += smallSquarePx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += smallSquarePx) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "#f2caca";
    ctx.lineWidth = 1;
    for (let x = gridOffset; x < width; x += largeSquarePx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y < height; y += largeSquarePx) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const drawSignal = (
    ctx,
    width,
    height,
    data,
    sr,
    pxPerSec,
    offset,
    color,
    verticalShift = 0,
  ) => {
    if (!data || data.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    const centerY = height / 2 + verticalShift;
    const amplitudeScale = height / 4;

    const startIndex = Math.max(
      0,
      Math.floor((-offset / pxPerSec) * sampleRate),
    );
    const endIndex = Math.min(
      data.length,
      Math.ceil(((width - offset) / pxPerSec) * sampleRate) + 1,
    );

    for (let i = startIndex; i < endIndex; i++) {
      const x = offset + (i / sampleRate) * pxPerSec;
      const y = centerY - data[i] * amplitudeScale;
      if (i === startIndex) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  const drawTemporalAnnotations = (
    ctx,
    width,
    height,
    tempAnns,
    pxPerSec,
    offset,
  ) => {
    if (!tempAnns || tempAnns.length === 0) return;
    tempAnns.forEach((ann) => {
      const startX = offset + ann.startTime * pxPerSec;
      const endX = offset + ann.endTime * pxPerSec;
      if (endX < 0 || startX > width) return; // Out of bounds

      const drawStartX = Math.max(0, startX);
      const drawWidth = Math.min(width, endX) - drawStartX;

      ctx.fillStyle = "rgba(230, 126, 34, 0.2)";
      ctx.fillRect(drawStartX, 0, drawWidth, height);
      ctx.strokeStyle = "#e67e22";
      ctx.beginPath();
      ctx.moveTo(drawStartX, 0);
      ctx.lineTo(drawStartX, height);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, height);
      ctx.stroke();

      ctx.fillStyle = "#d35400";
      ctx.font = "bold 11px Inter";
      ctx.fillText(ann.note, drawStartX + 4, 15);
    });
  };

  const drawSelection = (ctx, startPx, endPx, height) => {
    const minPx = Math.min(startPx, endPx);
    const maxPx = Math.max(startPx, endPx);
    ctx.fillStyle = "rgba(47, 128, 237, 0.25)";
    ctx.fillRect(minPx, 0, maxPx - minPx, height);
    ctx.strokeStyle = "#2f80ed";
    ctx.beginPath();
    ctx.moveTo(minPx, 0);
    ctx.lineTo(minPx, height);
    ctx.moveTo(maxPx, 0);
    ctx.lineTo(maxPx, height);
    ctx.stroke();
  };

  const drawAnnotations = (
    ctx,
    width,
    height,
    annots,
    sr,
    pxPerSec,
    offset,
  ) => {
    if (!annots || annots.length === 0) return;

    annots.forEach((ann) => {
      const x = offset + (ann.index / sr) * pxPerSec;
      if (x < 0 || x > width) return;

      // Ligne verticale de repère
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = ann.type === "peak" ? "transparent" : "#9b59b6";
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  };

  const handleMouseDown = (e) => {
    if (isLive || showPrompt) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (mode === "annotate") {
      setSelectionStartPx(x);
      setSelectionEndPx(x);
    } else {
      setLastMouseX(e.clientX);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || showPrompt) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    if (mode === "annotate") {
      setSelectionEndPx(x);
    } else {
      const deltaX = e.clientX - lastMouseX;
      setLastMouseX(e.clientX);
      setOffsetX((prev) => Math.min(0, prev + deltaX));
    }
  };

  const handleMouseUp = () => {
    if (isLive || !isDragging || showPrompt) return;
    setIsDragging(false);

    if (
      mode === "annotate" &&
      selectionStartPx !== null &&
      selectionEndPx !== null
    ) {
      const diff = Math.abs(selectionEndPx - selectionStartPx);
      if (diff > 10) {
        setShowPrompt(true); // User selected a valid area
      } else {
        setSelectionStartPx(null);
        setSelectionEndPx(null);
      }
    }
  };

  const handleSaveAnnotation = () => {
    if (
      noteInput.trim() &&
      selectionStartPx !== null &&
      selectionEndPx !== null
    ) {
      const minPx = Math.min(selectionStartPx, selectionEndPx);
      const maxPx = Math.max(selectionStartPx, selectionEndPx);

      const startTime = (minPx - offsetX) / pxPerSecond;
      const endTime = (maxPx - offsetX) / pxPerSecond;

      if (onAddTemporalAnnotation) {
        onAddTemporalAnnotation({ startTime, endTime, note: noteInput });
      }
    }
    setNoteInput("");
    setShowPrompt(false);
    setSelectionStartPx(null);
    setSelectionEndPx(null);
    setMode("pan");
  };

  const handleCancelAnnotation = () => {
    setNoteInput("");
    setShowPrompt(false);
    setSelectionStartPx(null);
    setSelectionEndPx(null);
  };

  const handleZoom = (factor) => {
    setZoom((prev) => Math.min(5, Math.max(0.5, prev * factor)));
  };

  return (
    <div className="interactive-ecg-container" style={{ position: "relative" }}>
      <div className="ecg-controls">
        {isLive && (
          <div className="ecg-live-badge">
            <span className="dot"></span> LIVE
          </div>
        )}

        {!isLive && (
          <div className="ecg-mode-toggle">
            <button
              className={mode === "pan" ? "active" : ""}
              onClick={() => setMode("pan")}
              title="Naviguer"
            >
              🔍 Pan
            </button>
            <button
              className={mode === "annotate" ? "active" : ""}
              onClick={() => setMode("annotate")}
              title="Sélectionner pour annoter"
            >
              ✏️ Tracer
            </button>
          </div>
        )}
        <div className="ecg-control-divider"></div>

        <button onClick={() => handleZoom(1.2)} title="Zoom In">
          +
        </button>
        <button onClick={() => handleZoom(0.8)} title="Zoom Out">
          -
        </button>
        <button
          onClick={() => {
            setZoom(1);
            setOffsetX(0);
          }}
          title="Reset"
        >
          ↺
        </button>
        <div className="ecg-control-divider"></div>
        <button
          className="ecg-btn-snapshot"
          onClick={() => {
            const link = document.createElement("a");
            link.download = `ECG_${new Date().getTime()}.png`;
            link.href = canvasRef.current.toDataURL();
            link.click();
          }}
          title="Capture"
        >
          📸
        </button>
      </div>

      <div
        ref={containerRef}
        className="ecg-canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isLive
            ? "default"
            : mode === "annotate"
              ? "crosshair"
              : isDragging
                ? "grabbing"
                : "grab",
        }}
      >
        <canvas ref={canvasRef} />
        <div className="ecg-edge-overlay left"></div>
        <div className="ecg-edge-overlay right"></div>
      </div>

      {showPrompt && (
        <div className="ecg-annotation-prompt">
          <h4>Nouvelle zone clinique</h4>
          <input
            autoFocus
            type="text"
            placeholder="Ex: Sus-décalage ST..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveAnnotation()}
          />
          <div className="prompt-actions">
            <button onClick={handleCancelAnnotation} className="btn-cancel">
              Annuler
            </button>
            <button onClick={handleSaveAnnotation} className="btn-save">
              Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="ecg-info-bar">
        <span>
          {isLive
            ? "Monitoring Continu"
            : `Durée: ${totalDuration.toFixed(1)}s`}
        </span>
        <span className="ecg-zoom-label">
          Vitesse: {Math.round(25 * zoom)} mm/s
        </span>
      </div>
    </div>
  );
};

export default InteractiveECG;

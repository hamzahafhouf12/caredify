import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import caredifyLogo from "../../assets/Caredify-logo.png";
import ThemeToggle from "../../components/ThemeToggle";
import { apiPost } from "../../utils/api";
import "./OTPVerify.css";

function OTPVerify() {
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  // Cooldown state
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  const inputs = useRef([]);

  // Start 30s cooldown timer
  const startCooldown = () => {
    setCooldown(30);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearInterval(cooldownRef.current);
  }, []);

  // Removed automatic send on mount to prevent Mailtrap rate limits.
  // The code is usually sent by the previous page (Forgot Password/Register).
  useEffect(() => {
    if (!email) {
      setError("Aucun email fourni. Veuillez recommencer l'opération.");
    }
  }, [email]);

  const handleSendOTP = async () => {
    if (!email) {
      setError("Veuillez entrer votre adresse email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiPost(`/auth/forgot-password`, { email });
      const data = await response.json();
      if (response.ok) {
        setResent(true);
        startCooldown();
        setTimeout(() => setResent(false), 5000);
      } else {
        setError(data.message || "Erreur lors de l'envoi du code");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const newOtp = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    if (pasted.length > 0) {
      inputs.current[Math.min(pasted.length - 1, 5)].focus();
    }
  };

  const handleConfirm = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Veuillez entrer les 6 chiffres du code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiPost(`/auth/verify-otp`, { email, otp: code });
      const data = await response.json();
      if (response.ok) {
        navigate("/reset-password", { state: { email, otp: code } });
      } else {
        setError(data.message || "Code OTP invalide ou expiré");
      }
    } catch (err) {
      setError("Erreur de connexion lors de la vérification");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    setOtp(["", "", "", "", "", ""]);
    handleSendOTP();
  };

  return (
    <div className={`otp-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="otp-card">
        <div className="otp-logo-area">
          <img src={caredifyLogo} alt="Caredify" className="otp-logo" />
        </div>

        <h2 className="otp-title">Entrer le code OTP</h2>

        {email && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            Un code a été envoyé à : <br />
            <strong>{email}</strong>
          </p>
        )}

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={handlePaste}
              className={`otp-box ${digit ? "otp-filled" : ""}`}
              aria-label={`Chiffre ${index + 1}`}
            />
          ))}
        </div>

        <div className="otp-actions-container">
          <button
            type="button"
            className="otp-resend"
            onClick={handleResend}
            disabled={loading || cooldown > 0}
            style={{
              opacity: cooldown > 0 ? 0.5 : 1,
              cursor: cooldown > 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Envoi..."
              : cooldown > 0
                ? `Renvoyer le code OTP (${cooldown}s)`
                : "Renvoyer le code OTP"}
          </button>

          {error ? <p className="otp-error">{error}</p> : null}
          {resent && !error ? (
            <p className="otp-resent">Code renvoyé avec succès !</p>
          ) : null}

          <button
            type="button"
            className={`otp-btn otp-btn-confirm ${loading ? "loading" : ""}`}
            onClick={handleConfirm}
            disabled={loading || otp.join("").length < 6}
          >
            {loading ? <span className="otp-spinner" /> : "Confirmer"}
          </button>

          <button
            type="button"
            className="otp-btn otp-btn-back"
            onClick={() => navigate("/login")}
          >
            Retour
          </button>
        </div>
      </div>

      <ThemeToggle
        darkMode={darkMode}
        onToggle={() => setDarkMode((d) => !d)}
      />
    </div>
  );
}

export default OTPVerify;

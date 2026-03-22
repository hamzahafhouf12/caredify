import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import caredifyLogo from "../../assets/caredify-logo.png"
import ThemeToggle from "../../components/ThemeToggle"
import "./OTPVerify.css"

function OTPVerify() {
  const [darkMode, setDarkMode] = useState(false)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resent, setResent] = useState(false)
  const inputs = useRef([])
  const navigate = useNavigate()

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")
    if (value && index < 5) {
      inputs.current[index + 1].focus()
    }
  }

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const newOtp = ["", "", "", "", "", ""]
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char
    })
    setOtp(newOtp)
    inputs.current[Math.min(pasted.length, 5)].focus()
  }

  const handleConfirm = () => {
    const code = otp.join("")
    if (code.length < 6) {
      setError("Veuillez entrer les 6 chiffres du code.")
      return
    }
    setLoading(true)
    setTimeout(() => {
      console.log("OTP confirmé :", code)
      setLoading(false)
      navigate("/login")
    }, 1200)
  }

  const handleResend = () => {
    setOtp(["", "", "", "", "", ""])
    setError("")
    setResent(true)
    setTimeout(() => inputs.current[0].focus(), 50)
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <div className={`otp-wrapper ${darkMode ? "dark" : ""}`}>
      <div className="otp-card">
        <div className="otp-logo-area">
          <img src={caredifyLogo} alt="Caredify" className="otp-logo" />
        </div>

        <h2 className="otp-title">Code de vérification</h2>
        <p className="otp-subtitle">
          Saisissez le code à 6 chiffres reçu par e-mail ou SMS
        </p>

        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputs.current[index] = el
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

        {error ? <p className="otp-error">{error}</p> : null}
        {resent ? <p className="otp-resent">Un nouveau code a été envoyé.</p> : null}

        <button type="button" className="otp-resend" onClick={handleResend}>
          Renvoyer le code
        </button>

        <button
          type="button"
          className={`otp-btn otp-btn-confirm ${loading ? "loading" : ""}`}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? <span className="otp-spinner" /> : "Confirmer"}
        </button>

        <button
          type="button"
          className="otp-btn otp-btn-back"
          onClick={() => navigate(-1)}
        >
          Retour
        </button>
      </div>

      <ThemeToggle
        darkMode={darkMode}
        onToggle={() => setDarkMode((d) => !d)}
        className="otp-theme-toggle"
      />
    </div>
  )
}

export default OTPVerify

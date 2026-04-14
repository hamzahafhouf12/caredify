/**
 * Générateur ECG Synthétique (P-QRS-T)
 * Simule un signal ECG à une fréquence d'échantillonnage de 250Hz
 */

const generateHeartbeat = (sampleRate = 250, heartRate = 70) => {
  const durationInSeconds = 60 / heartRate;
  const samplesPerBeat = Math.floor(sampleRate * durationInSeconds);
  const signal = new Array(samplesPerBeat).fill(0);

  // Position relative pour chaque onde (0.0 - 1.0)
  const pPos = 0.15;
  const qPos = 0.4;
  const rPos = 0.45;
  const sPos = 0.5;
  const tPos = 0.75;

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = i / samplesPerBeat;
    let val = 0;

    // Onde P (sinus small)
    val += 0.1 * Math.exp(-Math.pow((t - pPos) / 0.02, 2));

    // Complexe QRS (sharp spike)
    // Q
    val -= 0.15 * Math.exp(-Math.pow((t - qPos) / 0.005, 2));
    // R (High spike)
    val += 1.0 * Math.exp(-Math.pow((t - rPos) / 0.005, 2));
    // S
    val -= 0.25 * Math.exp(-Math.pow((t - sPos) / 0.005, 2));

    // Onde T
    val += 0.25 * Math.exp(-Math.pow((t - tPos) / 0.04, 2));

    // Bruit de fond (très léger)
    val += (Math.random() - 0.5) * 0.02;

    signal[i] = val;
  }

  return signal;
};

module.exports = { generateHeartbeat };

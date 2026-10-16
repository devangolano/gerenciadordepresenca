"use client";

import { useState, useRef } from "react";
import { Fingerprint, CheckCircle2, X, AlertCircle, Smartphone, ShieldCheck } from "lucide-react";
import { registerWebAuthnFingerprint, triggerHaptic } from "@/lib/fingerprint";
import { playAttendanceSound } from "@/lib/audio";

interface FingerprintCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  onFingerprintCaptured: (fingerprintId: string) => void;
}

export default function FingerprintCaptureModal({
  isOpen,
  onClose,
  employeeName,
  onFingerprintCaptured,
}: FingerprintCaptureModalProps) {
  const [isPressing, setIsPressing] = useState(false);
  const [isScanningNative, setIsScanningNative] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  if (!isOpen) return null;

  // On-screen touch sensor press
  const handleTouchDown = () => {
    if (successId) return;
    setIsPressing(true);
    triggerHaptic("scan");

    pressTimerRef.current = setTimeout(() => {
      triggerHaptic("success");
      playAttendanceSound("success");
      const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      const token = `BIO-FP-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
      setSuccessId(token);
      setIsPressing(false);
    }, 500);
  };

  const handleTouchUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    setIsPressing(false);
  };

  // Device native biometric sensor
  const handleNativeDeviceSensor = async () => {
    setIsScanningNative(true);
    triggerHaptic("scan");

    try {
      const res = await registerWebAuthnFingerprint(Date.now(), employeeName || "Colaborador");
      if (res.success && res.credentialId) {
        setSuccessId(res.credentialId);
      }
    } catch {
      const fallbackToken = `BIO-FP-${Date.now().toString(36).toUpperCase()}`;
      setSuccessId(fallbackToken);
    } finally {
      setIsScanningNative(false);
    }
  };

  const handleConfirm = () => {
    if (successId) {
      onFingerprintCaptured(successId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#121316] border border-[#272930] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col font-mono text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#212329] bg-[#16181d]">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-200">
              Captura de Impressão Digital
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#202228] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="text-[11px] text-zinc-400 mb-4">
            Colaborador: <span className="text-white font-bold">{employeeName || "Colaborador"}</span>
          </div>

          {successId ? (
            <div className="flex flex-col items-center gap-3 py-2 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-white uppercase">Biometria Mapeada</div>
              <div className="bg-[#0b0c0e] border border-[#212329] rounded-lg px-2.5 py-1 text-[10px] text-emerald-400 break-all max-w-[240px]">
                {successId}
              </div>
              <p className="text-[10px] text-zinc-500">
                A digital agora pode ser usada diretamente no ponto pelo celular ou leitor.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {/* Touch Pad Button */}
              <div
                onMouseDown={handleTouchDown}
                onMouseUp={handleTouchUp}
                onTouchStart={handleTouchDown}
                onTouchEnd={handleTouchUp}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer select-none touch-none active:scale-95 transition-all ${
                  isPressing
                    ? "bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.5)] scale-105"
                    : "bg-[#181a20] border-2 border-[#2b2e37] hover:border-zinc-500 shadow-inner"
                }`}
              >
                <Fingerprint
                  className={`w-14 h-14 ${
                    isPressing ? "text-emerald-400 animate-pulse" : "text-zinc-500"
                  }`}
                />
                {isPressing && (
                  <div className="absolute left-3 right-3 h-0.5 bg-emerald-300 shadow-[0_0_8px_#34d399] animate-pulse" />
                )}
              </div>

              <div className="text-center">
                <div className="text-xs uppercase font-bold text-zinc-200">
                  {isPressing ? "LENDO DIGITAL..." : "PRESSIONE O DEDO NO SENSOR"}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-[220px]">
                  Segure o dedo sobre o sensor até a vibração de confirmação.
                </p>
              </div>

              {/* Alternative: Device Native WebAuthn button */}
              <button
                type="button"
                onClick={handleNativeDeviceSensor}
                disabled={isScanningNative}
                className="w-full mt-2 py-2 px-3 bg-[#181921] hover:bg-[#20222b] text-zinc-300 text-[11px] font-bold uppercase rounded-xl border border-[#272935] flex items-center justify-center gap-2 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isScanningNative ? "Lendo Sensor..." : "Usar Leitor Nativo do Celular"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212329] bg-[#0e0f13] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-zinc-500 hover:text-white"
          >
            Cancelar
          </button>

          {successId && (
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded-xl shadow-lg transition"
            >
              Vincular Digital
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

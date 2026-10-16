"use client";

import { useState, useRef, useEffect } from "react";
import { Fingerprint, CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/fingerprint";
import { playAttendanceSound } from "@/lib/audio";

interface Employee {
  id: number;
  name: string;
  department: string;
  photo_url?: string;
  fingerprint_id?: string;
}

interface MobileFingerprintScannerProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onFingerprintVerified: (employeeId: number) => void;
}

export default function MobileFingerprintScanner({
  isOpen,
  onClose,
  employees,
  onFingerprintVerified,
}: MobileFingerprintScannerProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isPressing, setIsPressing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "success" | "error">("idle");
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // If there's only 1 employee or an employee was pre-selected
  useEffect(() => {
    if (isOpen) {
      setScanState("idle");
      setScanProgress(0);
      setIsPressing(false);
      if (employees.length === 1) {
        setSelectedEmployeeId(employees[0].id);
      } else {
        setSelectedEmployeeId(null);
      }
    }
  }, [isOpen, employees]);

  if (!isOpen) return null;

  const startScanning = () => {
    if (!selectedEmployeeId && employees.length > 1) {
      alert("Por favor, selecione seu nome na lista antes de encostar o dedo no sensor.");
      return;
    }

    const empId = selectedEmployeeId || (employees.length > 0 ? employees[0].id : null);
    if (!empId) {
      alert("Nenhum colaborador com biometria cadastrada no sistema.");
      return;
    }

    setIsPressing(true);
    setScanState("scanning");
    triggerHaptic("scan");

    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += 10;
      setScanProgress(progress);
      if (progress % 30 === 0) {
        triggerHaptic("scan");
      }
    }, 40);

    pressTimerRef.current = setTimeout(() => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setScanProgress(100);
      setScanState("success");
      triggerHaptic("success");
      playAttendanceSound("success");

      setTimeout(() => {
        onFingerprintVerified(empId);
        onClose();
      }, 500);
    }, 450);
  };

  const cancelScanning = () => {
    if (scanState === "success") return;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setIsPressing(false);
    setScanProgress(0);
    setScanState("idle");
  };

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#121316] border border-[#272930] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#212329] bg-[#16181d]">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-300 font-bold">
              Sensor Biométrico
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg hover:bg-[#202228] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          {/* Employee Selection if multiple */}
          {employees.length > 1 && !selectedEmployeeId && (
            <div className="w-full mb-4 text-left">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2">
                1. Selecione o Colaborador:
              </label>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-[#212329] rounded-xl p-2 bg-[#0d0e11]">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => setSelectedEmployeeId(emp.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#1a1c22] transition text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#212329] flex items-center justify-center text-xs font-mono font-bold text-zinc-300">
                        {emp.photo_url ? (
                          <img src={emp.photo_url} alt="" className="w-full h-full object-cover rounded-md" />
                        ) : (
                          emp.name.charAt(0)
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 transition truncate max-w-[170px]">
                        {emp.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">
                      Selecionar
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedEmployee && (
            <div className="w-full mb-4 p-2.5 bg-[#0d0e11] border border-[#212329] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-8 h-8 rounded-lg bg-[#212329] overflow-hidden flex items-center justify-center text-xs font-bold text-zinc-200">
                  {selectedEmployee.photo_url ? (
                    <img src={selectedEmployee.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedEmployee.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white leading-tight">
                    {selectedEmployee.name}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {selectedEmployee.department}
                  </div>
                </div>
              </div>
              {employees.length > 1 && (
                <button
                  onClick={() => setSelectedEmployeeId(null)}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#1a1c22] hover:bg-[#252830]"
                >
                  Trocar
                </button>
              )}
            </div>
          )}

          {/* Large In-Display Fingerprint Sensor Pad */}
          <div className="my-3 flex flex-col items-center">
            <button
              type="button"
              onMouseDown={startScanning}
              onMouseUp={cancelScanning}
              onMouseLeave={cancelScanning}
              onTouchStart={startScanning}
              onTouchEnd={cancelScanning}
              onTouchCancel={cancelScanning}
              className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all select-none touch-none active:scale-95 cursor-pointer ${
                scanState === "success"
                  ? "bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.5)]"
                  : isPressing
                  ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)] scale-105"
                  : "bg-[#181a20] border-2 border-[#2b2e37] hover:border-zinc-500 shadow-inner"
              }`}
            >
              {/* Animated Progress Ring */}
              {isPressing && (
                <div
                  className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-spin"
                  style={{ animationDuration: "1s" }}
                />
              )}

              {/* Glowing Sensor Icon */}
              <Fingerprint
                className={`w-16 h-16 transition-colors duration-150 ${
                  scanState === "success"
                    ? "text-emerald-400"
                    : isPressing
                    ? "text-cyan-300 animate-pulse"
                    : "text-zinc-500"
                }`}
              />

              {/* Optical Laser Bar across sensor */}
              {isPressing && (
                <div className="absolute left-3 right-3 h-0.5 bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-pulse" />
              )}
            </button>

            <span className="mt-3 text-xs font-mono tracking-wider uppercase font-semibold text-zinc-300">
              {scanState === "success"
                ? "Digital Reconhecida!"
                : isPressing
                ? "Lendo impressão digital..."
                : "Pressione e segure o dedo aqui"}
            </span>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[240px]">
              {selectedEmployee
                ? "Mantenha o dedo firme na área indicada até a confirmação com vibração."
                : "Selecione o funcionário acima e encoste o dedo no sensor óptico."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#212329] bg-[#0f1013] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>Óptico Capacitivo</span>
          <span>100% Celular / Kiosk</span>
        </div>
      </div>
    </div>
  );
}

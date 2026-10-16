"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Lock,
  Unlock,
  Camera,
  Fingerprint,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Wifi,
} from "lucide-react";
import { extractFaceDescriptorFromElement, captureSnapshotFromVideo, euclideanDistance, loadFaceModels } from "@/lib/face";
import { playAttendanceSound } from "@/lib/audio";
import { verifyWebAuthnFingerprint, triggerHaptic } from "@/lib/fingerprint";
import MobileFingerprintScanner from "@/components/MobileFingerprintScanner";

interface EmployeeBiometric {
  id: number;
  name: string;
  department: string;
  position: string;
  photo_url?: string;
  face_descriptor?: string;
  fingerprint_id?: string;
  pin?: string;
}

interface RecentPunch {
  id: number;
  employee_name: string;
  employee_photo?: string;
  employee_department?: string;
  timestamp: string;
  type: "entry" | "exit";
  verification_method: "face" | "fingerprint" | "pin";
  status: string;
}

export default function RelogioTerminalPage() {
  // Authentication / Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [companyName, setCompanyName] = useState("Gestão de Presença & Biometria");

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Camera & Face Recognition State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeBiometric[]>([]);
  const [recentPunches, setRecentPunches] = useState<RecentPunch[]>([]);

  // Recognition Feedback
  const [scanStatus, setScanStatus] = useState<"idle" | "detecting" | "recognized" | "cooldown">("idle");
  const [punchFeedback, setPunchFeedback] = useState<{
    employeeName: string;
    photoUrl?: string;
    type: "entry" | "exit";
    status: string;
    message: string;
    time: string;
  } | null>(null);

  // Touch / Mobile Biometrics Modal
  const [isMobileFingerScannerOpen, setIsMobileFingerScannerOpen] = useState(false);

  // Exit Confirmation Modal (2nd punch confirmation)
  const [exitConfirmationData, setExitConfirmationData] = useState<{
    employee: { id: number; name: string; photo_url?: string; department?: string; position?: string };
    firstPunchTime?: string;
    payload: any;
  } | null>(null);

  // Daily Limit Alert
  const [dailyLimitAlert, setDailyLimitAlert] = useState<{
    employeeName: string;
    message: string;
  } | null>(null);

  // Fallback PIN Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [employeePinInput, setEmployeePinInput] = useState("");
  const [submittingPunch, setSubmittingPunch] = useState(false);

  // Cooldown tracker
  const lastPunchRef = useRef<{ id: number; time: number } | null>(null);

  // Clock tick
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check saved session unlock state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("terminal_unlocked");
      if (unlocked === "true") {
        setIsUnlocked(true);
      }
    }
  }, []);

  // Fetch data
  const loadTerminalData = useCallback(async () => {
    try {
      const [empRes, punchRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/attendance/recent"),
      ]);
      const empData = await empRes.json();
      const punchData = await punchRes.json();

      if (empData.success) {
        setEmployees(empData.employees || []);
      }
      if (punchData.success) {
        setRecentPunches(punchData.records || []);
      }
    } catch (err) {
      console.error("Error loading terminal data:", err);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      loadTerminalData();
      loadFaceModels().then((ok) => setModelsReady(ok));
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isUnlocked, facingMode, loadTerminalData]);

  // Terminal Lock / Unlock
  const handleUnlockTerminal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput) return;

    setIsVerifyingPin(true);
    setPinError(null);

    try {
      const res = await fetch("/api/terminal/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();

      if (data.success) {
        setIsUnlocked(true);
        if (data.companyName) setCompanyName(data.companyName);
        sessionStorage.setItem("terminal_unlocked", "true");
        setPinInput("");
        triggerHaptic("success");
      } else {
        setPinError(data.message || "Senha incorreta.");
        playAttendanceSound("error");
        triggerHaptic("error");
      }
    } catch (err: any) {
      setPinError("Erro ao verificar senha: " + err.message);
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLockTerminal = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem("terminal_unlocked");
    stopCamera();
    triggerHaptic("scan");
  };

  // Camera Management
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError("Câmera indisponível. Registre a presença pelo leitor biométrico digital ou PIN.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Register punch in backend
  const submitPunch = async (payload: {
    employeeId?: number;
    pin?: string;
    fingerprintId?: string;
    verificationMethod: "face" | "fingerprint" | "pin";
    photoSnapshot?: string;
    confirmedExit?: boolean;
  }) => {
    setSubmittingPunch(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Check if this is the 2nd punch and requires exit confirmation
      if (data.requiresExitConfirmation && data.employee) {
        triggerHaptic("scan");
        playAttendanceSound("warning");
        setExitConfirmationData({
          employee: data.employee,
          firstPunchTime: data.firstPunchTime,
          payload: payload,
        });
        setScanStatus("idle");
        return;
      }

      // Check if maximum punches of the day was reached (2 punches max)
      if (data.code === "DAILY_LIMIT_REACHED") {
        triggerHaptic("error");
        playAttendanceSound("warning");
        setDailyLimitAlert({
          employeeName: data.employee?.name || "Colaborador",
          message: data.message || "Você já bateu o ponto duas vezes hoje (Entrada e Saída).",
        });
        setScanStatus("idle");
        setTimeout(() => setDailyLimitAlert(null), 5000);
        return;
      }

      if (data.success && data.employee) {
        triggerHaptic("success");
        if (data.status === "late" || data.status === "day_off_work") {
          playAttendanceSound("warning");
        } else {
          playAttendanceSound("success");
        }

        const nowStr = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        setPunchFeedback({
          employeeName: data.employee.name,
          photoUrl: payload.photoSnapshot || data.employee.photo_url,
          type: data.punchType || "entry",
          status: data.status || "on_time",
          message: data.message || "Ponto registrado com sucesso!",
          time: nowStr,
        });

        loadTerminalData();

        setTimeout(() => {
          setPunchFeedback(null);
          setScanStatus("idle");
        }, 4500);
      } else {
        triggerHaptic("error");
        playAttendanceSound("error");
        alert(data.message || "Falha ao registrar ponto.");
        setScanStatus("idle");
      }
    } catch (err: any) {
      triggerHaptic("error");
      playAttendanceSound("error");
      alert("Erro na conexão: " + err.message);
      setScanStatus("idle");
    } finally {
      setSubmittingPunch(false);
    }
  };

  // Continuous facial recognition detection loop
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isUnlocked && cameraActive && modelsReady && scanStatus !== "cooldown" && !punchFeedback) {
      timer = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

        try {
          const result = await extractFaceDescriptorFromElement(videoRef.current);
          if (!result || !result.descriptor) return;

          setScanStatus("detecting");

          const employeesWithFaces = employees.filter((e) => !!e.face_descriptor);
          let bestMatch: { emp: EmployeeBiometric; distance: number } | null = null;

          for (const emp of employeesWithFaces) {
            try {
              const savedDescriptor = JSON.parse(emp.face_descriptor!);
              const dist = euclideanDistance(result.descriptor, savedDescriptor);

              if (dist < 0.52) {
                if (!bestMatch || dist < bestMatch.distance) {
                  bestMatch = { emp, distance: dist };
                }
              }
            } catch {}
          }

          if (bestMatch) {
            const now = Date.now();
            if (
              lastPunchRef.current &&
              lastPunchRef.current.id === bestMatch.emp.id &&
              now - lastPunchRef.current.time < 8000
            ) {
              return;
            }

            lastPunchRef.current = { id: bestMatch.emp.id, time: now };
            setScanStatus("recognized");

            const snapshot = captureSnapshotFromVideo(videoRef.current, result.box);

            await submitPunch({
              employeeId: bestMatch.emp.id,
              verificationMethod: "face",
              photoSnapshot: snapshot,
            });
          }
        } catch (err) {
          console.warn("Face detection tick error:", err);
        }
      }, 600);
    }

    return () => clearInterval(timer);
  }, [isUnlocked, cameraActive, modelsReady, employees, scanStatus, punchFeedback]);

  // Fingerprint Action on mobile
  const handleFingerprintClick = async () => {
    triggerHaptic("scan");
    // Attempt native platform authenticator first if possible
    try {
      const allowedCredentials = employees
        .map((e) => e.fingerprint_id)
        .filter((id): id is string => !!id);

      const res = await verifyWebAuthnFingerprint(allowedCredentials);
      if (res.success && res.credentialId) {
        await submitPunch({
          fingerprintId: res.credentialId,
          verificationMethod: "fingerprint",
        });
        return;
      }
    } catch {}

    // Open dedicated mobile touch biometric pad
    setIsMobileFingerScannerOpen(true);
  };

  const handleMobileFingerprintVerified = async (employeeId: number) => {
    await submitPunch({
      employeeId,
      verificationMethod: "fingerprint",
    });
  };

  // Fallback PIN submit
  const handleEmployeePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeePinInput) return;

    await submitPunch({
      pin: employeePinInput,
      verificationMethod: "pin",
    });

    setEmployeePinInput("");
    setIsPinModalOpen(false);
  };

  const formatDatePt = (date: Date) => {
    const days = [
      "DOMINGO",
      "SEGUNDA-FEIRA",
      "TERÇA-FEIRA",
      "QUARTA-FEIRA",
      "QUINTA-FEIRA",
      "SEXTA-FEIRA",
      "SÁBADO",
    ];
    const months = [
      "JAN",
      "FEV",
      "MAR",
      "ABR",
      "MAI",
      "JUN",
      "JUL",
      "AGO",
      "SET",
      "OUT",
      "NOV",
      "DEZ",
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // -------------------------------------------------------------------
  // VIEW 1: LOCKED SCREEN (Authentic Terminal Password Access)
  // -------------------------------------------------------------------
  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0c0d0f] flex flex-col items-center justify-center p-4 select-none font-sans">
        <div className="w-full max-w-sm bg-[#141519] border border-[#23252d] rounded-3xl p-7 shadow-2xl flex flex-col items-center text-center">
          {/* Mechanical Lock Bezel */}
          <div className="w-16 h-16 rounded-2xl bg-[#1b1d24] border border-[#2b2e3a] flex items-center justify-center text-zinc-300 shadow-inner mb-4">
            <Lock className="w-8 h-8 text-zinc-400" />
          </div>

          <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-1">
            ESTAÇÃO DE PONTO BIOMÉTRICO
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Terminal Bloqueado</h2>
          <p className="text-xs text-zinc-400 mt-1.5 max-w-xs">
            Digite a senha mestra para liberar o relógio para registro de presença.
          </p>

          {/* Form */}
          <form onSubmit={handleUnlockTerminal} className="w-full mt-6 space-y-3.5">
            {pinError && (
              <div className="p-2.5 bg-rose-950/70 border border-rose-900 rounded-xl text-rose-300 text-xs flex items-center gap-2 text-left font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pinError}</span>
              </div>
            )}

            <div className="relative">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full bg-[#0d0e11] border border-[#23252d] focus:border-zinc-500 rounded-xl py-3 text-center tracking-[0.5em] text-2xl font-mono text-white placeholder:text-zinc-700 focus:outline-none transition shadow-inner"
              />
            </div>

            {/* Industrial Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    triggerHaptic("scan");
                    setPinInput((prev) => prev + digit);
                  }}
                  className="py-3 bg-[#191b22] hover:bg-[#20232c] text-zinc-200 font-bold text-lg rounded-xl border border-[#262833] active:scale-95 transition shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("scan");
                  setPinInput("");
                }}
                className="py-3 bg-[#16171d] hover:bg-[#1b1c24] text-zinc-500 font-bold text-xs uppercase rounded-xl border border-[#22232c] active:scale-95 transition"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("scan");
                  setPinInput((prev) => prev + "0");
                }}
                className="py-3 bg-[#191b22] hover:bg-[#20232c] text-zinc-200 font-bold text-lg rounded-xl border border-[#262833] active:scale-95 transition"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("scan");
                  setPinInput((prev) => prev.slice(0, -1));
                }}
                className="py-3 bg-[#16171d] hover:bg-[#1b1c24] text-zinc-500 font-bold text-sm rounded-xl border border-[#22232c] active:scale-95 transition"
              >
                ←
              </button>
            </div>

            <button
              type="submit"
              disabled={isVerifyingPin || !pinInput}
              className="w-full py-3 bg-zinc-200 hover:bg-white text-zinc-900 font-mono font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {isVerifyingPin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-800" />
                  <span>AUTORIZANDO...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-zinc-800" />
                  <span>LIBERAR RELÓGIO</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-[10px] font-mono text-zinc-600">
            SENHA DE FÁBRICA: <span className="text-zinc-400 font-bold">1234</span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------
  // VIEW 2: INDUSTRIAL BIOMETRIC HARDWARE TIME CLOCK (NO DASHBOARD BUTTON!)
  // -------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-[#08090b] text-zinc-100 flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* Top Industrial Hardware Bezel */}
      <header className="bg-[#101115] border-b border-[#20222a] px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-zinc-300">
              TERMINAL BIOMÉTRICO • RP-01
            </span>
          </div>
          <span className="hidden sm:inline-block font-mono text-[10px] text-zinc-600 uppercase border-l border-[#242731] pl-3">
            {companyName}
          </span>
        </div>

        {/* Hardware Controls (Camera switch, Fullscreen, Lock) - NO DASHBOARD BUTTON */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCameraFacing}
            className="p-2 rounded-lg bg-[#181a20] hover:bg-[#22252e] text-zinc-400 hover:text-zinc-200 border border-[#262833] transition"
            title="Alternar Câmera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-[#181a20] hover:bg-[#22252e] text-zinc-400 hover:text-zinc-200 border border-[#262833] transition"
            title="Tela Cheia"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLockTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1b1618] hover:bg-[#281b1f] text-rose-400 border border-rose-950/80 font-mono text-xs uppercase font-semibold transition"
            title="Travar o Relógio com Senha"
          >
            <Lock className="w-3 h-3 text-rose-400" />
            <span>TRAVAR</span>
          </button>
        </div>
      </header>

      {/* Main Terminal Stage */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-3 max-w-lg mx-auto w-full">
        {/* Massive Authentic Digital Clock Face */}
        <div className="text-center mb-3">
          <div className="flex items-baseline justify-center font-mono font-black tracking-tight text-white leading-none">
            {currentTime ? (
              <>
                <span className="text-5xl sm:text-7xl tabular-nums">
                  {String(currentTime.getHours()).padStart(2, "0")}
                </span>
                <span className="text-3xl sm:text-5xl text-zinc-500 mx-0.5 animate-pulse">:</span>
                <span className="text-5xl sm:text-7xl tabular-nums">
                  {String(currentTime.getMinutes()).padStart(2, "0")}
                </span>
                <span className="text-3xl sm:text-5xl text-zinc-500 mx-0.5 animate-pulse">:</span>
                <span className="text-2xl sm:text-4xl text-amber-400 tabular-nums font-bold">
                  {String(currentTime.getSeconds()).padStart(2, "0")}
                </span>
              </>
            ) : (
              <span className="text-5xl text-zinc-700">00:00:00</span>
            )}
          </div>
          <div className="text-zinc-400 font-mono text-xs tracking-wider uppercase mt-1 font-semibold">
            {currentTime ? formatDatePt(currentTime) : "SINCRONIZANDO..."}
          </div>
        </div>

        {/* Optical Face Scanner Viewport */}
        <div className="relative w-full aspect-4/3 max-h-[300px] rounded-2xl overflow-hidden bg-black border-2 border-[#20222a] shadow-2xl flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-300 font-mono">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-3 px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-mono text-white"
              >
                REINICIAR CÂMERA
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />

              {/* Optical Reticle Laser Frame */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div
                  className={`w-44 h-56 rounded-2xl border-2 transition-all duration-200 relative ${
                    scanStatus === "recognized"
                      ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_25px_rgba(52,211,153,0.6)] scale-105"
                      : scanStatus === "detecting"
                      ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                      : "border-zinc-600/60 border-dashed"
                  }`}
                >
                  {/* Crosshairs (+) */}
                  <span className="absolute -top-1.5 -left-1.5 text-zinc-400 font-mono text-xs">+</span>
                  <span className="absolute -top-1.5 -right-1.5 text-zinc-400 font-mono text-xs">+</span>
                  <span className="absolute -bottom-1.5 -left-1.5 text-zinc-400 font-mono text-xs">+</span>
                  <span className="absolute -bottom-1.5 -right-1.5 text-zinc-400 font-mono text-xs">+</span>

                  {/* Horizontal laser scan beam */}
                  <div className="absolute left-1 right-1 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] top-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              </div>

              {/* Status Header inside Camera HUD */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                <span className="bg-black/70 backdrop-blur border border-zinc-800 font-mono text-[10px] text-zinc-200 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      scanStatus === "recognized"
                        ? "bg-emerald-400 animate-ping"
                        : scanStatus === "detecting"
                        ? "bg-cyan-400 animate-pulse"
                        : "bg-zinc-500"
                    }`}
                  />
                  {scanStatus === "recognized"
                    ? "RECONHECIDO"
                    : scanStatus === "detecting"
                    ? "IDENTIFICANDO..."
                    : "APROXIME O ROSTO"}
                </span>

                <span className="bg-black/70 backdrop-blur border border-zinc-800 font-mono text-[10px] text-zinc-400 px-2 py-0.5 rounded-md">
                  {employees.filter((e) => e.face_descriptor).length} FACES
                </span>
              </div>
            </>
          )}

          {/* Instant Punch Confirmation Overlay */}
          {punchFeedback && (
            <div className="absolute inset-0 z-30 bg-[#0e1014]/95 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center animate-in zoom-in-95 duration-150">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xl shadow-emerald-500/20 mb-3 bg-[#181a20]">
                {punchFeedback.photoUrl ? (
                  <img
                    src={punchFeedback.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold font-mono">
                    {punchFeedback.employeeName.charAt(0)}
                  </div>
                )}
              </div>

              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border mb-1 ${
                  punchFeedback.type === "entry"
                    ? "bg-blue-950/80 text-blue-300 border-blue-800"
                    : "bg-amber-950/80 text-amber-300 border-amber-800"
                }`}
              >
                {punchFeedback.type === "entry" ? "ENTRADA CONFIRMADA" : "SAÍDA CONFIRMADA"}
              </span>

              <h3 className="text-lg font-bold text-white mt-0.5">{punchFeedback.employeeName}</h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono max-w-xs">{punchFeedback.message}</p>

              <div className="mt-2 text-[10px] font-mono text-emerald-400">
                HORÁRIO: {punchFeedback.time}
              </div>
            </div>
          )}
        </div>

        {/* Physical Biometric Action Pads (Special focus on Phone Fingerprint) */}
        <div className="grid grid-cols-2 gap-3 w-full mt-4">
          {/* Fingerprint Button (Special for Mobile Phone Point) */}
          <button
            type="button"
            onClick={handleFingerprintClick}
            disabled={submittingPunch}
            className="py-3 px-3 bg-[#14161c] hover:bg-[#1a1d26] border border-[#272b38] rounded-2xl flex items-center justify-center gap-2.5 text-xs font-mono font-bold uppercase text-emerald-400 active:scale-95 transition shadow-lg"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Fingerprint className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-left leading-tight">
              <div>SENSOR DIGITAL</div>
              <div className="text-[9px] text-zinc-500 font-normal">CELULAR / TOUCH</div>
            </div>
          </button>

          {/* Backup Employee PIN */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("scan");
              setIsPinModalOpen(true);
            }}
            disabled={submittingPunch}
            className="py-3 px-3 bg-[#14161c] hover:bg-[#1a1d26] border border-[#272b38] rounded-2xl flex items-center justify-center gap-2.5 text-xs font-mono font-bold uppercase text-zinc-300 active:scale-95 transition shadow-lg"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-left leading-tight">
              <div>DIGITAR PIN</div>
              <div className="text-[9px] text-zinc-500 font-normal">EMERGÊNCIA</div>
            </div>
          </button>
        </div>
      </main>

      {/* Bottom Live Thermal Punch Ticker */}
      <footer className="bg-[#101115] border-t border-[#20222a] px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-500 uppercase font-bold shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>ÚLTIMAS BATIDAS:</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {recentPunches.length === 0 ? (
              <span className="text-[10px] font-mono text-zinc-600">
                AGUARDANDO PRIMEIRO REGISTRO...
              </span>
            ) : (
              recentPunches.slice(0, 3).map((punch) => {
                const timeStr = new Date(punch.timestamp).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={punch.id}
                    className="flex items-center gap-2 bg-[#171820] border border-[#262835] rounded-lg px-2 py-1 shrink-0 font-mono text-[11px]"
                  >
                    <span className="font-bold text-zinc-200 truncate max-w-[90px]">
                      {punch.employee_name.split(" ")[0]}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1 py-0.2 rounded ${
                        punch.type === "entry" ? "text-blue-400 bg-blue-950" : "text-amber-400 bg-amber-950"
                      }`}
                    >
                      {punch.type === "entry" ? "ENT" : "SAÍ"}
                    </span>
                    <span className="text-zinc-500 text-[10px]">{timeStr}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </footer>

      {/* Dedicated Mobile Touch Biometric Scanner Component */}
      <MobileFingerprintScanner
        isOpen={isMobileFingerScannerOpen}
        onClose={() => setIsMobileFingerScannerOpen(false)}
        employees={employees}
        onFingerprintVerified={handleMobileFingerprintVerified}
      />

      {/* Fallback Employee PIN Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141519] border border-[#23252d] rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center font-mono">
            <KeyRound className="w-8 h-8 text-zinc-400 mb-2" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">PIN do Colaborador</h3>
            <p className="text-[10px] text-zinc-500 mt-1 mb-4">
              Digite seu PIN de 4 dígitos cadastrado
            </p>

            <form onSubmit={handleEmployeePinSubmit} className="w-full space-y-3">
              <input
                type="password"
                maxLength={6}
                value={employeePinInput}
                onChange={(e) => setEmployeePinInput(e.target.value)}
                placeholder="••••"
                autoFocus
                className="w-full bg-[#0d0e11] border border-[#23252d] rounded-xl py-2.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none focus:border-zinc-500"
              />

              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => {
                      triggerHaptic("scan");
                      setEmployeePinInput((prev) => prev + digit);
                    }}
                    className="py-2.5 bg-[#191b22] hover:bg-[#20232c] text-white font-bold text-sm rounded-lg border border-[#262833]"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setEmployeePinInput("")}
                  className="py-2.5 bg-[#16171d] text-zinc-500 text-[10px] uppercase rounded-lg border border-[#22232c]"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("scan");
                    setEmployeePinInput((prev) => prev + "0");
                  }}
                  className="py-2.5 bg-[#191b22] text-white font-bold text-sm rounded-lg border border-[#262833]"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeePinInput((prev) => prev.slice(0, -1))}
                  className="py-2.5 bg-[#16171d] text-zinc-500 text-xs rounded-lg border border-[#22232c]"
                >
                  ←
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  className="w-1/2 py-2 bg-[#1b1d24] text-zinc-400 text-xs uppercase font-semibold rounded-lg hover:bg-[#252833]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPunch || !employeePinInput}
                  className="w-1/2 py-2 bg-zinc-200 text-zinc-900 text-xs uppercase font-bold rounded-lg hover:bg-white transition"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal (Second Punch of the Day) */}
      {exitConfirmationData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#12141a] border-2 border-amber-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center font-mono">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800">
              CONFIRMAÇÃO DE SAÍDA (2ª BATIDA)
            </span>

            <h3 className="text-base font-bold text-white mt-3">
              {exitConfirmationData.employee.name}
            </h3>

            {exitConfirmationData.firstPunchTime && (
              <div className="text-[11px] text-zinc-400 mt-1">
                Entrada registrada hoje às:{" "}
                <span className="text-white font-bold">{exitConfirmationData.firstPunchTime}</span>
              </div>
            )}

            <div className="mt-4 p-3 bg-[#0b0c10] border border-[#21232d] rounded-xl text-left text-xs text-zinc-300 font-sans leading-relaxed">
              Você já registrou a sua entrada hoje. Deseja confirmar que <strong>já está a sair</strong> e encerrar o seu expediente agora?
            </div>

            <div className="flex items-center gap-2.5 w-full mt-5">
              <button
                type="button"
                onClick={() => {
                  setExitConfirmationData(null);
                  setScanStatus("idle");
                  triggerHaptic("scan");
                }}
                className="w-1/2 py-2.5 bg-[#1a1c24] hover:bg-[#252834] text-zinc-400 hover:text-white text-xs uppercase font-bold rounded-xl transition border border-[#282b39]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const p = { ...exitConfirmationData.payload, confirmedExit: true };
                  setExitConfirmationData(null);
                  await submitPunch(p);
                }}
                className="w-1/2 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs uppercase font-bold rounded-xl shadow-lg transition active:scale-95"
              >
                Sim, Estou a Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Limit Reached Modal */}
      {dailyLimitAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-[#14151a] border-2 border-rose-500/60 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center font-mono">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2.5 py-0.5 rounded bg-rose-950/60 border border-rose-800">
              LIMITE DIÁRIO ATINGIDO (2/2)
            </span>

            <h3 className="text-base font-bold text-white mt-3">
              {dailyLimitAlert.employeeName}
            </h3>

            <div className="mt-3 p-3 bg-[#0d0e12] border border-[#23252e] rounded-xl text-xs text-zinc-300 font-sans leading-relaxed">
              {dailyLimitAlert.message}
            </div>

            <p className="text-[10px] text-zinc-500 mt-2">
              Cada pessoa só pode bater o ponto 2 vezes ao dia (Entrada e Saída).
            </p>

            <button
              type="button"
              onClick={() => setDailyLimitAlert(null)}
              className="w-full mt-4 py-2.5 bg-zinc-200 hover:bg-white text-zinc-950 text-xs uppercase font-bold rounded-xl transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

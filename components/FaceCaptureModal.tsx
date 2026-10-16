"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, RefreshCw, X, AlertCircle } from "lucide-react";
import { extractFaceDescriptorFromElement, captureSnapshotFromVideo, loadFaceModels } from "@/lib/face";
import { triggerHaptic } from "@/lib/fingerprint";
import { playAttendanceSound } from "@/lib/audio";

interface FaceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFaceCaptured: (data: { photoUrl: string; faceDescriptor: number[] }) => void;
}

export default function FaceCaptureModal({
  isOpen,
  onClose,
  onFaceCaptured,
}: FaceCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  // Captured preview
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null);

  useEffect(() => {
    let active = true;

    if (isOpen) {
      setErrorMsg(null);
      setCapturedPhoto(null);
      setCapturedDescriptor(null);
      setFaceDetected(false);
      setIsLoadingModels(true);

      loadFaceModels()
        .then((success) => {
          if (!active) return;
          setIsLoadingModels(false);
          if (!success) {
            setErrorMsg("Falha ao inicializar modelos neurais de visão.");
          } else {
            startCamera();
          }
        })
        .catch((err) => {
          if (!active) return;
          setIsLoadingModels(false);
          setErrorMsg("Erro ao inicializar IA: " + err.message);
        });
    } else {
      stopCamera();
    }

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      stopCamera();
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
      console.error("Camera access error:", err);
      setErrorMsg("Não foi possível acessar a câmera. Verifique as permissões do dispositivo.");
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

  // Periodic detection
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cameraActive && !capturedPhoto) {
      interval = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

        try {
          const res = await extractFaceDescriptorFromElement(videoRef.current);
          if (res && res.score > 0.55) {
            setFaceDetected(true);
          } else {
            setFaceDetected(false);
          }
        } catch {
          setFaceDetected(false);
        }
      }, 600);
    }

    return () => clearInterval(interval);
  }, [cameraActive, capturedPhoto]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setDetecting(true);
    setErrorMsg(null);
    triggerHaptic("scan");

    try {
      const res = await extractFaceDescriptorFromElement(videoRef.current);

      if (!res) {
        setErrorMsg("Rosto não enquadrado claramente. Mantenha-se estável e tente novamente.");
        setDetecting(false);
        triggerHaptic("error");
        return;
      }

      const photo = captureSnapshotFromVideo(videoRef.current, res.box);
      setCapturedPhoto(photo);
      setCapturedDescriptor(res.descriptor);
      setDetecting(false);
      triggerHaptic("success");
      playAttendanceSound("success");
    } catch (err: any) {
      setErrorMsg("Erro ao processar imagem: " + err.message);
      setDetecting(false);
      triggerHaptic("error");
    }
  };

  const handleConfirm = () => {
    if (capturedPhoto && capturedDescriptor) {
      onFaceCaptured({
        photoUrl: capturedPhoto,
        faceDescriptor: capturedDescriptor,
      });
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCapturedDescriptor(null);
    setFaceDetected(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#121316] border border-[#272930] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col font-mono text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#212329] bg-[#16181d]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-zinc-200">
              Mapeamento Biométrico Facial
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
        <div className="p-5 flex flex-col items-center">
          {errorMsg && (
            <div className="w-full mb-3 p-2.5 bg-rose-950/70 border border-rose-900 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Viewport */}
          <div className="relative w-full aspect-4/3 max-w-sm rounded-2xl overflow-hidden bg-black border-2 border-[#22242d] shadow-inner flex items-center justify-center">
            {isLoadingModels && (
              <div className="flex flex-col items-center gap-2 text-zinc-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span>INICIALIZANDO REDE NEURAL...</span>
              </div>
            )}

            {!isLoadingModels && capturedPhoto ? (
              <div className="relative w-full h-full">
                <img
                  src={capturedPhoto}
                  alt="Rosto Capturado"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-end p-3">
                  <div className="bg-emerald-500 text-zinc-950 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>128 PONTOS BIOMÉTRICOS EXTRAÍDOS</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                />

                {/* Target Frame with Crosshairs */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-40 h-52 rounded-2xl border-2 transition-all relative ${
                      faceDetected
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                        : "border-zinc-500/50 border-dashed"
                    }`}
                  >
                    <span className="absolute -top-1.5 -left-1.5 text-zinc-400 text-xs">+</span>
                    <span className="absolute -top-1.5 -right-1.5 text-zinc-400 text-xs">+</span>
                    <span className="absolute -bottom-1.5 -left-1.5 text-zinc-400 text-xs">+</span>
                    <span className="absolute -bottom-1.5 -right-1.5 text-zinc-400 text-xs">+</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5 pointer-events-none">
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      faceDetected ? "bg-emerald-500 text-zinc-950" : "bg-black/80 text-zinc-400 border border-zinc-800"
                    }`}
                  >
                    {faceDetected ? "ROSTO ENQUADRADO" : "CENTRALIZE O ROSTO"}
                  </span>
                </div>

                {/* Camera Flip */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-zinc-300 p-1.5 rounded-lg border border-zinc-800 transition"
                  title="Trocar Câmera"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <p className="text-[10px] text-zinc-500 mt-3 text-center">
            Certifique-se de estar em ambiente bem iluminado para calibração ideal do sensor facial.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212329] bg-[#0e0f13] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-zinc-500 hover:text-white"
          >
            Cancelar
          </button>

          {capturedPhoto ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetake}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase text-zinc-400 hover:text-white bg-[#191b22] hover:bg-[#20232c]"
              >
                Repetir
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded-xl transition"
              >
                Confirmar
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={detecting || isLoadingModels}
              onClick={handleCapture}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center gap-1.5 ${
                faceDetected
                  ? "bg-zinc-100 hover:bg-white text-zinc-950 shadow-lg"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              }`}
            >
              {detecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5" />
                  <span>CAPTURAR FACE</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

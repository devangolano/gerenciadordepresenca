let faceApiModule: any = null;
let modelsLoaded = false;
let modelsLoadingPromise: Promise<boolean> | null = null;

export async function getFaceApi() {
  if (typeof window === "undefined") return null;
  if (!faceApiModule) {
    faceApiModule = await import("@vladmandic/face-api");
  }
  return faceApiModule;
}

export async function loadFaceModels(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (modelsLoaded) return true;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    try {
      const faceapi = await getFaceApi();
      if (!faceapi) return false;

      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      modelsLoaded = true;
      return true;
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      return false;
    }
  })();

  return modelsLoadingPromise;
}

export function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (!arr1 || !arr2 || arr1.length !== arr2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export interface DetectedFaceResult {
  descriptor: number[];
  box: { x: number; y: number; width: number; height: number };
  score: number;
}

export async function extractFaceDescriptorFromElement(
  element: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<DetectedFaceResult | null> {
  const faceapi = await getFaceApi();
  if (!faceapi) return null;

  await loadFaceModels();

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });

    const detection = await faceapi
      .detectSingleFace(element, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) return null;

    return {
      descriptor: Array.from(detection.descriptor),
      box: {
        x: detection.detection.box.x,
        y: detection.detection.box.y,
        width: detection.detection.box.width,
        height: detection.detection.box.height,
      },
      score: detection.detection.score,
    };
  } catch (err) {
    console.error("Error in extractFaceDescriptorFromElement:", err);
    return null;
  }
}

export function captureSnapshotFromVideo(
  video: HTMLVideoElement,
  box?: { x: number; y: number; width: number; height: number }
): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch (err) {
    console.error("Error capturing video snapshot:", err);
    return "";
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, RotateCcw, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";

type Facing = "environment" | "user";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (dataUrl: string) => void;
}

export function CameraCapture({ open, onOpenChange, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [starting, setStarting] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(
    async (mode: Facing) => {
      setStarting(true);
      setError(null);
      stop();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        const err = e as DOMException;
        const msg =
          err.name === "NotAllowedError"
            ? "Camera access denied. Please allow camera permissions."
            : err.name === "NotFoundError"
              ? "No camera found on this device."
              : err.message || "Could not start camera.";
        setError(msg);
        toast.error(msg);
      } finally {
        setStarting(false);
      }
    },
    [stop],
  );

  useEffect(() => {
    if (open && !shot) start(facing);
    if (!open) {
      stop();
      setShot(null);
      setError(null);
    }
    return () => {
      if (!open) stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  useEffect(() => () => stop(), [stop]);

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const raw = canvas.toDataURL("image/jpeg", 0.92);
    const compressed = await compressImage(raw, { maxWidth: 1200, quality: 0.8 });
    setShot(compressed);
    stop();
  }, [stop]);

  const retake = useCallback(() => {
    setShot(null);
    start(facing);
  }, [facing, start]);

  const confirm = useCallback(() => {
    if (!shot) return;
    onCapture(shot);
    onOpenChange(false);
  }, [shot, onCapture, onOpenChange]);

  const switchCamera = useCallback(() => {
    const next: Facing = facing === "environment" ? "user" : "environment";
    setFacing(next);
  }, [facing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" /> Camera
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video flex items-center justify-center">
          {shot ? (
            <img src={shot} alt="Preview of the captured medical document" className="h-full w-full object-contain" />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-contain animate-in fade-in"
              />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Starting camera…
                </div>
              )}
              {error && !starting && (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
                  {error}
                </div>
              )}
              {!error && !starting && (
                <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/40" />
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-border bg-background">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          {shot ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={retake}>
                <RotateCcw className="mr-2 h-4 w-4" /> Retake
              </Button>
              <Button size="sm" onClick={confirm}>
                <Check className="mr-2 h-4 w-4" /> Use photo
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={switchCamera} disabled={starting}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {facing === "environment" ? "Front" : "Back"}
              </Button>
              <Button size="sm" onClick={capture} disabled={starting || !!error}>
                <Camera className="mr-2 h-4 w-4" /> Capture
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

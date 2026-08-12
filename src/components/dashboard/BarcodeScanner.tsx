import { useEffect, useRef, useState } from "react";
import { ScanLine, X, AlertTriangle } from "lucide-react";

/**
 * Camera barcode scanner. The ZXing library is browser-only, so it is loaded
 * lazily inside useEffect — never at module scope (SSR safe).
 */
function ScannerModal({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (!videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result && !cancelled) {
            cancelled = true;
            onDetected(result.getText());
          }
        });
      } catch (err) {
        setError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera permission denied. Type the barcode manually below."
            : "Camera not available on this device. Type the barcode manually below.",
        );
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <ScanLine className="w-4 h-4" /> Scan barcode
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {error ? (
            <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black aspect-video object-cover"
              muted
              playsInline
            />
          )}
          <div className="flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manual.trim()) onDetected(manual.trim());
              }}
              placeholder="Or type / scan with USB scanner…"
              className="flex-1 rounded-lg border border-input px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => manual.trim() && onDetected(manual.trim())}
              className="btn-outline"
            >
              Use
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Camera scanning needs a secure (https) connection and camera permission. USB/Bluetooth
            scanners work without it.
          </p>
        </div>
      </div>
    </div>
  );
}

export function BarcodeScannerButton({
  onDetected,
  label = "Scan",
  className = "",
}: {
  onDetected: (code: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border hover:bg-surface ${className}`}
        title="Scan barcode with camera"
      >
        <ScanLine className="w-4 h-4" />
        {label}
      </button>
      {open && (
        <ScannerModal
          onDetected={(code) => {
            setOpen(false);
            onDetected(code);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [Html5Qrcode, setHtml5Qrcode] = useState(null);

  // Dynamically import html5-qrcode
  useEffect(() => {
    import('html5-qrcode').then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });
  }, []);

  // Auto-start scanner when component loads
  useEffect(() => {
    if (Html5Qrcode) {
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  }, [Html5Qrcode]);

  const startScanner = async () => {
    if (!Html5Qrcode) return;

    const qrReaderElement = document.getElementById("qr-reader");
    if (!qrReaderElement) {
      setTimeout(startScanner, 200);
      return;
    }

    try {
      setScanning(true);
      setError("");

      const html5QrCode = new Html5Qrcode("qr-reader");

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText) => onScanSuccess(decodedText, html5QrCode),
        () => {} // Ignore scan failures
      );

      // Hide scan region box
      setTimeout(() => {
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          const scanRegion = qrReader.querySelector('#qr-shaded-region');
          if (scanRegion) scanRegion.style.display = 'none';
        }
      }, 100);
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Unable to access camera. Please check permissions.");
      setScanning(false);
    }
  };

  const onScanSuccess = async (decodedText, html5QrCode) => {
    try {
      await html5QrCode.stop();
      html5QrCode.clear();
    } catch (err) {
      console.log("Scanner stop:", err);
    }

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Handle different QR code formats
    if (decodedText.includes('orderzap') || decodedText.includes('localhost')) {
      // Direct URL - navigate to it
      window.location.href = decodedText;
    } else if (decodedText.includes('/demo/')) {
      // Demo route
      router.push(decodedText);
    } else {
      // Assume it's a table number for demo
      router.push(`/demo/m/${decodedText}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-2 border-gray-200 shadow-lg bg-black">
          <div id="qr-reader" className="w-full h-full" />
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center mx-auto mb-4">
                  <ScanLine size={32} className="text-gray-600" />
                </div>
                <p className="text-gray-900 text-sm font-medium mb-2">Camera Access Required</p>
                <p className="text-gray-600 text-xs mb-6">Please allow camera access to scan QR codes</p>
                <button
                  onClick={startScanner}
                  className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors w-full"
                >
                  Grant Access
                </button>
              </div>
            </div>
          )}
          
          {!error && scanning && (
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white text-xs text-center font-medium bg-black/60 backdrop-blur-sm py-2 px-4 rounded-lg">
                Position QR code in the center
              </p>
            </div>
          )}

          {/* Scanner overlay corners */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="relative w-full h-full">
              {/* Top left corner */}
              <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-white/80"></div>
              {/* Top right corner */}
              <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-white/80"></div>
              {/* Bottom left corner */}
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-white/80"></div>
              {/* Bottom right corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-white/80"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

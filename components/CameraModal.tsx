
import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Loader2 } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setIsInitializing(true);
    setCapturedImage(null);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 }, // Try for HD for better OCR
          height: { ideal: 1080 },
          facingMode: "environment"
        } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera Access Error:", err);
      setError("Could not access camera. Please check permissions.");
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw image
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Simple filter to enhance text contrast (optional but helpful for OCR)
        // Note: For now keeping raw capture to avoid canvas tainting issues or complexity
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleConfirm = () => {
    if (capturedImage) {
      const base64 = capturedImage.split(',')[1];
      onCapture(base64);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl relative">
        {/* Header */}
        <div className="absolute top-4 right-4 z-50">
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl aspect-[4/3] md:aspect-[16/9] border-4 border-slate-800">
          {error ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 gap-4">
                <Camera size={48} />
                <p className="font-bold">{error}</p>
             </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-contain"
            />
          )}
          
          {isInitializing && !error && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="animate-spin text-white w-12 h-12" />
             </div>
          )}
          
          {/* Guide Overlay for Documents */}
          {!capturedImage && !error && !isInitializing && (
             <div className="absolute inset-0 pointer-events-none border-[2px] border-white/20 m-8 rounded-xl border-dashed flex items-center justify-center">
                <p className="text-white/50 text-xs font-black uppercase tracking-widest bg-black/50 px-3 py-1 rounded">Align Paper Here</p>
             </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-8 flex justify-center gap-6">
          {capturedImage ? (
            <>
              <button 
                onClick={handleRetake}
                className="px-8 py-4 bg-slate-800 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-slate-700 transition-all"
              >
                <RefreshCw size={16} /> Retake
              </button>
              <button 
                onClick={handleConfirm}
                className="px-12 py-4 bg-green-600 text-white rounded-full font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-green-700 shadow-lg hover:scale-105 transition-all"
              >
                <Check size={16} /> Use Photo
              </button>
            </>
          ) : (
            !error && (
              <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center hover:scale-110 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
              >
                <div className="w-16 h-16 bg-slate-900 rounded-full" />
              </button>
            )
          )}
        </div>
        
        {!capturedImage && (
           <p className="text-center text-slate-400 mt-4 text-[10px] font-bold uppercase tracking-widest">
              Ensure good lighting for AI to read your handwriting
           </p>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraModal;

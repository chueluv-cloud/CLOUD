/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, History, Zap, RefreshCw, Download, Share2, Sparkles, Clock, Globe, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// --- Constants & Types ---

type AppState = 'IDLE' | 'CAMERA' | 'PROCESSING' | 'RESULT';

interface Era {
  id: string;
  name: string;
  year: string;
  description: string;
  prompt: string;
  color: string;
}

const ERAS: Era[] = [
  {
    id: 'ancient-egypt',
    name: 'Ancient Egypt',
    year: '1350 BCE',
    description: 'Golden sands and monumental pyramids of the New Kingdom.',
    prompt: 'A cinematic, photorealistic portrait of the person as a powerful Pharaoh in Ancient Egypt. They are wearing a majestic Nemes headcloth with gold and lapis lazuli stripes, an ornate jeweled collar, and royal Egyptian attire. Background is the interior of a sunlit stone temple with hieroglyphics and statues of gods. Warm golden lighting.',
    color: '#EAB308'
  },
  {
    id: 'medieval',
    name: 'Medieval Knight',
    year: '1240 CE',
    description: 'The age of chivalry, iron armor, and grand stone castles.',
    prompt: 'A cinematic, photorealistic portrait of the person as a heroic Medieval knight. They are wearing detailed, battle-worn plate armor with a velvet surcoat featuring a heraldic crest. Background is a castle courtyard with stone walls and fluttering banners. Dramatic, overcast lighting.',
    color: '#94A3B8'
  },
  {
    id: 'renaissance',
    name: 'Renaissance Master',
    year: '1505 CE',
    description: 'The rebirth of art and culture in atmospheric Florence.',
    prompt: 'A cinematic, photorealistic portrait of the person as a Renaissance artist or aristocrat. They are wearing rich velvet robes with fur trimmings and a traditional cap. Style resembles a masterpiece oil painting with soft sfumato lighting. Background is an ornate studio with half-finished canvases.',
    color: '#991B1B'
  },
  {
    id: 'victorian',
    name: 'Victorian Steampunk',
    year: '1885 CE',
    description: 'Industrial progress mixed with neo-Victorian flair.',
    prompt: 'A cinematic, photorealistic portrait of the person in Victorian steampunk attire. They are wearing a sharp frock coat, a decorative waistcoat, and brass-detailed goggles. Background is a foggy London street with gas lamps, gears, and distant zeppelins. Cool atmospheric lighting.',
    color: '#78350F'
  },
  {
    id: '1920s',
    name: 'Jazz Age',
    year: '1925 CE',
    description: 'The roaring twenties with glitz, glamor, and jazz.',
    prompt: 'A cinematic, photorealistic portrait of the person in 1920s Jazz Age attire. They are wearing a stylish tuxedo or a beaded flapper dress with elegant accessories. Background is a glamorous Art Deco ballroom with golden highlights and a jazz band in the soft-focus distance.',
    color: '#C2410C'
  },
  {
    id: 'space-age',
    name: 'Moon Landing',
    year: '1969 CE',
    description: 'One giant leap for mankind on the lunar surface.',
    prompt: 'A cinematic, photorealistic portrait of the person as an Apollo astronaut on the Moon. They are wearing a detailed NASA spacesuit with the visor reflecting the lunar landscape and the distant Earth. Background is the stark, cratered surface of the moon under a black starry sky.',
    color: '#3B82F6'
  }
];

// --- Components ---

export default function App() {
  const [state, setState] = useState<AppState>('IDLE');
  const [selectedEra, setSelectedEra] = useState<Era>(ERAS[0]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Camera Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setState('CAMERA');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        processTravel(dataUrl);
      }
    }
  };

  // --- AI Logic ---

  const processTravel = async (image: string) => {
    setState('PROCESSING');
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // Remove base64 header
      const base64Data = image.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg'
              }
            },
            {
              text: `${selectedEra.prompt} Crucially, maintain the person's exact facial features and identity from the provided photo. High resolution, 1K, photorealistic, cinematic lighting.`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
            imageSize: '1K'
          }
        }
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setResultImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error('No image returned from temporal link.');
      }

      setState('RESULT');
    } catch (err) {
      console.error('Temporal processing error:', err);
      setError('Temporal link lost. Please try re-synchronizing.');
      setState('CAMERA');
      startCamera();
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResultImage(null);
    setError(null);
    setState('IDLE');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-[#F27D26] selection:text-white overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#F27D26] rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-[#E4E3E0]/20 rounded-full flex items-center justify-center bg-[#151619] shadow-inner">
              <Clock className="w-6 h-6 text-[#F27D26]" />
            </div>
            <div>
              <h1 className="text-2xl font-display uppercase tracking-widest font-black italic">Chronos Booth</h1>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-40">Temporal Displacement Unit // Alpha 0.9</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-mono uppercase tracking-widest opacity-60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
              SYSTEM READY
            </div>
            <div className="w-[1px] h-4 bg-[#E4E3E0]/20" />
            <div>CORE: GEMINI-2.5-FLASH</div>
          </div>
        </header>

        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          {/* Era Selection Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 opacity-40" />
              <h2 className="text-xs font-mono uppercase tracking-widest opacity-60">Destination Database</h2>
            </div>
            
            {ERAS.map((era) => (
              <motion.button
                key={era.id}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEra(era)}
                className={`group relative p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 text-left ${
                  selectedEra.id === era.id 
                    ? 'bg-[#151619] border-[#F27D26] shadow-[0_0_20px_rgba(242,125,38,0.1)]' 
                    : 'bg-transparent border-[#E4E3E0]/10 hover:border-[#E4E3E0]/30'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center bg-[#1A1A1A] border border-[#E4E3E0]/10"
                  style={{ color: era.color }}
                >
                  <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm tracking-tight">{era.name}</h3>
                    <span className="text-[10px] font-mono opacity-40">{era.year}</span>
                  </div>
                  <p className="text-[11px] opacity-40 leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all">
                    {era.description}
                  </p>
                </div>
                {selectedEra.id === era.id && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#F27D26] rounded-full"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Main Stage */}
          <div className="lg:col-span-8 bg-[#151619] rounded-3xl border border-[#E4E3E0]/10 relative overflow-hidden flex flex-col shadow-2xl">
            <AnimatePresence mode="wait">
              {state === 'IDLE' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="w-32 h-32 mb-8 relative">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 border border-dashed border-[#F27D26]/40 rounded-full"
                    />
                    <div className="absolute inset-4 border border-[#F27D26]/20 rounded-full animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-[#F27D26]" />
                    </div>
                  </div>
                  <h2 className="text-4xl font-display italic uppercase mb-4 tracking-tighter">Enter the Slipstream</h2>
                  <p className="max-w-md mx-auto text-sm opacity-50 leading-relaxed mb-10">
                    Our temporal displacement unit requires a biological footprint to synchronize with the target era. 
                    Prepare for synchronization.
                  </p>
                  <button
                    id="init-camera-btn"
                    onClick={startCamera}
                    className="group bg-[#F27D26] hover:bg-[#F27D26]/90 text-white px-10 py-5 rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-[0_10px_30px_rgba(242,125,38,0.3)]"
                  >
                    Initialize Connection
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              )}

              {state === 'CAMERA' && (
                <motion.div
                  key="camera"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 relative flex flex-col"
                >
                  <div className="flex-1 bg-black relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    
                    {/* Camera Overlays */}
                    <div className="absolute inset-0 border-[40px] border-[#151619]/60 pointer-events-none" />
                    <div className="absolute inset-[40px] border border-[#E4E3E0]/10 pointer-events-none" />
                    
                    {/* Focus Markings */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-[#F27D26]/40 rounded-[60px] pointer-events-none">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-2 bg-[#151619] text-[8px] font-mono text-[#F27D26]/60">EYE_LINE</div>
                    </div>
                  </div>

                  <div className="p-8 flex items-center justify-between border-t border-[#E4E3E0]/10">
                    <div className="flex items-center gap-4 text-[10px] font-mono opacity-40 uppercase">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                        LIVE_FEED
                      </div>
                      <div>POS: {selectedEra.name} // {selectedEra.year}</div>
                    </div>

                    <button
                      id="capture-photo-btn"
                      onClick={capturePhoto}
                      disabled={state === 'PROCESSING'}
                      className="w-20 h-20 rounded-full border-4 border-[#F27D26] p-1 group flex-shrink-0 transition-all hover:scale-110 active:scale-90"
                    >
                      <div className="w-full h-full rounded-full bg-white group-hover:bg-[#F27D26]/20 transition-colors flex items-center justify-center">
                        <div className="w-4 h-4 bg-[#F27D26] rounded-sm transform rotate-45" />
                      </div>
                    </button>

                    <button
                      id="cancel-camera-btn"
                      onClick={reset}
                      className="text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                      Abort Mission
                    </button>
                  </div>
                </motion.div>
              )}

              {state === 'PROCESSING' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col items-center justify-center p-12 text-center"
                >
                  <div className="w-48 h-48 mb-12 relative flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-[#F27D26]/20 rounded-full blur-3xl"
                    />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 border-r-4 border-[#F27D26] rounded-full"
                    />
                    <Sparkles className="w-12 h-12 text-[#F27D26]" />
                  </div>
                  <h2 className="text-3xl font-display italic uppercase mb-2 tracking-tighter">Bending Time</h2>
                  <p className="text-xs font-mono uppercase tracking-[0.3em] opacity-40 animate-pulse">
                    Materializing into {selectedEra.name}...
                  </p>
                  
                  <div className="mt-12 w-full max-w-xs h-1 bg-[#E4E3E0]/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-1/2 h-full bg-[#F27D26]"
                    />
                  </div>
                </motion.div>
              )}

              {state === 'RESULT' && resultImage && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="flex-1 bg-black relative group overflow-hidden">
                    <img 
                      src={resultImage} 
                      alt="Temporal Result"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Dramatic Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    
                    <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-mono text-[#F27D26] mb-1">ARRIVAL IDENTIFIED</div>
                        <h3 className="text-3xl font-display uppercase italic tracking-tighter font-black">
                          {selectedEra.name}
                        </h3>
                        <p className="text-[10px] font-mono opacity-60 uppercase">{selectedEra.year} // CHRONOS UNIT VALIDATED</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          id="download-btn"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = resultImage;
                            link.download = `chronos_booth_${selectedEra.id}.png`;
                            link.click();
                          }}
                          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-all"
                        >
                          <Download className="w-5 h-5 text-white" />
                        </button>
                        <button
                          id="share-btn"
                          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-all"
                        >
                          <Share2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>

                    {/* Scanlines Effect */}
                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
                  </div>

                  <div className="p-8 flex items-center justify-between border-t border-[#E4E3E0]/10 bg-[#151619]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-[#E4E3E0]/10 rounded-full flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 opacity-40 hover:rotate-180 transition-transform cursor-pointer" onClick={() => { setState('CAMERA'); startCamera(); }} />
                      </div>
                      <p className="text-[10px] font-mono opacity-40 uppercase tracking-widest">Temporal Signature Locked</p>
                    </div>

                    <button
                      id="new-voyage-btn"
                      onClick={reset}
                      className="bg-[#F27D26] hover:bg-[#F27D26]/90 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
                    >
                      <Zap className="w-3 h-3" />
                      New Voyage
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-mono rounded-full flex items-center gap-2 z-50">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Footer Technical Metadata */}
        <footer className="mt-8 flex items-center justify-between text-[8px] font-mono opacity-20 uppercase tracking-[0.4em]">
          <div>T-COORD: {selectedEra.id.toUpperCase()} // LAT: 27.2046° N // LONG: 77.4977° E</div>
          <div>© 2244 CHRONOS DEFENSE SYSTEMS // PROBABILITY FIELD: STABLE</div>
        </footer>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}


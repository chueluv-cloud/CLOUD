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
    <div className="min-h-screen bg-[#0A0A0C] text-[#E4E3E0] font-mono selection:bg-[#C5A059] selection:text-black overflow-hidden selection:bg-[#C5A059]">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C5A059] rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#8C6239] rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-3xl font-serif font-bold tracking-tighter text-[#C5A059] italic uppercase">Chronosnap</h1>
              <p className="text-[9px] font-mono uppercase tracking-[0.4em] opacity-40">Temporal Imaging Laboratory // 2244.A</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-10 text-[10px] font-mono uppercase tracking-[0.3em]">
            <div className="flex items-center gap-2 gold-text">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] shadow-[0_0_8px_#C5A059]" />
              SYST_CALIBRATED
            </div>
            <div className="opacity-40">GALLERY_INDEX</div>
            <div className="opacity-40 text-right">
              <div className="text-[8px] opacity-60">LOC: 40.7128 N</div>
              <div className="text-[8px] opacity-60">EPOCH: CURRENT</div>
            </div>
          </div>
        </header>

        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
          {/* Era Selection Sidebar */}
          <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] opacity-50">Temporal Destinations</div>
            </div>
            
            {ERAS.map((era) => (
              <motion.button
                key={era.id}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedEra(era)}
                className={`group relative p-4 rounded-sm border transition-all duration-300 flex flex-col gap-1 text-left ${
                  selectedEra.id === era.id 
                    ? 'glass-panel border-l-4 border-l-[#C5A059] shadow-[0_0_30px_rgba(197,160,89,0.05)]' 
                    : 'bg-transparent border-transparent opacity-40 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-lg tracking-tight group-hover:text-[#C5A059] transition-colors">{era.name}</h3>
                  <span className="text-[9px] font-mono opacity-50">{era.year}</span>
                </div>
                <p className="text-[9px] opacity-40 uppercase tracking-widest leading-relaxed">
                  {era.description.split('.')[0]}
                </p>
              </motion.button>
            ))}

            <div className="mt-auto pt-6">
              <div className="glass-panel p-4 rounded-sm">
                <div className="flex justify-between text-[10px] mb-2 uppercase tracking-widest">
                  <span className="opacity-60">Sync_Lock</span>
                  <span className="text-[#C5A059]">Engaged</span>
                </div>
                <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    animate={{ width: ['0%', '100%'] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                    className="h-full bg-[#C5A059]" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Stage */}
          <div className="lg:col-span-7 flex flex-col gap-4 relative">
            <div className="flex-1 bg-[#111113] ornate-border relative overflow-hidden flex flex-col group shadow-2xl">
              <AnimatePresence mode="wait">
                {state === 'IDLE' && (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center p-12 text-center relative"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.05)_0%,transparent_70%)]" />
                    <div className="w-32 h-32 mb-8 relative">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 border border-dashed border-[#C5A059]/20 rounded-full"
                      />
                      <div className="absolute inset-4 border border-[#C5A059]/10 rounded-full" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-[#C5A059] opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-serif italic mb-4 tracking-tighter gold-text">Initiate Exposure</h2>
                    <p className="max-w-xs mx-auto text-[10px] uppercase tracking-[0.2em] opacity-40 leading-relaxed mb-10">
                      Align biological sensors to synchronize with the selected temporal epoch.
                    </p>
                    <button
                      id="init-camera-btn"
                      onClick={startCamera}
                      className="group border border-[#C5A059]/40 hover:bg-[#C5A059] hover:text-black text-[#C5A059] px-10 py-4 rounded-sm font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(197,160,89,0.1)]"
                    >
                      Connect Probe
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
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
                        className="w-full h-full object-cover grayscale opacity-60 mix-blend-screen"
                      />
                      
                      {/* Technical Overlays */}
                      <div className="absolute inset-0 border-[20px] border-[#0A0A0C]/80 pointer-events-none" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <div className="w-64 h-80 border border-dashed border-[#C5A059]/40 rounded-full flex items-center justify-center">
                          <span className="text-[10px] uppercase tracking-[0.4em] text-[#C5A059] opacity-40">ALIGN_FACE_V.01</span>
                        </div>
                      </div>
                      
                      <div className="absolute top-6 right-6 text-[9px] bg-black/80 px-3 py-1 border border-[#C5A059]/30 text-[#C5A059]">
                        LIVE_FEED // DEST: {selectedEra.id.toUpperCase()}
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                      <button
                        id="capture-photo-btn"
                        onClick={capturePhoto}
                        disabled={state === 'PROCESSING'}
                        className="bg-[#C5A059] text-black px-12 py-4 rounded-sm font-bold uppercase tracking-[0.4em] text-xs hover:bg-[#D4B57A] transition-all transform active:scale-95 shadow-2xl flex items-center gap-3"
                      >
                        Engage Warp
                        <Zap className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="absolute top-6 left-6 flex gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse"></div>
                      <div className="w-2 h-2 rounded-full bg-white/10"></div>
                      <div className="w-2 h-2 rounded-full bg-white/10"></div>
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
                    <div className="absolute inset-0 scanline-effect opacity-50" />
                    <div className="w-48 h-48 mb-12 relative flex items-center justify-center">
                      <motion.div 
                        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0 bg-[#C5A059]/10 rounded-full blur-3xl"
                      />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 border-t border-[#C5A059] rounded-full"
                      />
                      <Sparkles className="w-10 h-10 text-[#C5A059]" />
                    </div>
                    <h2 className="text-2xl font-serif italic mb-2 tracking-tighter gold-text">Reconstructing Reality</h2>
                    <p className="text-[9px] font-mono uppercase tracking-[0.5em] opacity-40 animate-pulse">
                      Synthesizing {selectedEra.year} Displacement Field...
                    </p>
                  </motion.div>
                )}

                {state === 'RESULT' && resultImage && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col relative"
                  >
                    <div className="flex-1 bg-black relative overflow-hidden">
                      <img 
                        src={resultImage} 
                        alt="Temporal Result"
                        className="w-full h-full object-cover mix-blend-lighten"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      <div className="absolute inset-0 scanline-effect opacity-20 pointer-events-none" />

                      <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between">
                        <div>
                          <div className="text-[9px] font-mono text-[#C5A059] mb-1 tracking-[0.4em]">EPOCH_IDENTIFIED</div>
                          <h3 className="text-4xl font-serif uppercase italic tracking-tighter font-bold gold-text">
                            {selectedEra.name}
                          </h3>
                        </div>
                        
                        <div className="flex gap-4">
                          <button
                            id="download-btn"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = resultImage;
                              link.download = `chronsnap_${selectedEra.id}.png`;
                              link.click();
                            }}
                            className="p-4 border border-white/20 hover:bg-white text-white hover:text-black transition-all rounded-sm backdrop-blur-md"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Thumbnail Strip */}
            <div className="h-24 flex gap-4 overflow-hidden py-2">
              <div className="w-32 glass-panel border-white/5 grayscale flex-shrink-0 animate-pulse"></div>
              <div className="w-32 glass-panel border-white/5 opacity-50 flex-shrink-0"></div>
              <div className="w-32 glass-panel border-white/5 opacity-20 flex-shrink-0"></div>
              <div className="w-32 glass-panel border-white/5 opacity-5 flex-shrink-0"></div>
            </div>
          </div>

          {/* Right Controls */}
          <aside className="lg:col-span-2 flex flex-col gap-10">
            <div className="flex flex-col gap-6">
              <span className="text-[9px] uppercase tracking-[0.3em] opacity-50 border-b border-white/10 pb-2">Calibration</span>
              <div className="space-y-6">
                {[
                  { label: 'BLENDING', value: '82%' },
                  { label: 'GRAIN', value: '14%' },
                  { label: 'SEPIA', value: '45%' },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="flex justify-between text-[9px] font-mono">
                      <span>{stat.label}</span>
                      <span className="text-[#C5A059]">{stat.value}</span>
                    </div>
                    <div className="h-[1px] bg-white/10 w-full relative">
                      <div className="absolute top-1/2 -translate-y-1/2 left-[82%] w-1.5 h-1.5 bg-[#C5A059] rotate-45 shadow-[0_0_8px_rgba(197,160,89,0.5)]"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-3">
              {state === 'RESULT' && (
                <button
                  id="new-voyage-btn"
                  onClick={reset}
                  className="w-full py-4 glass-panel text-[10px] uppercase tracking-[0.3em] hover:bg-[#C5A059] hover:text-black transition-all duration-500 rounded-sm"
                >
                  New Analysis
                </button>
              )}
              <button className="w-full py-4 border border-white/10 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-500 rounded-sm opacity-60">
                Save Archive
              </button>
            </div>

            <div className="p-4 glass-panel text-[8px] leading-relaxed opacity-40 italic rounded-sm">
              Temporal drift may occur during high-fidelity reconstruct. Maintain biological stillness.
            </div>
          </aside>
        </section>

        {/* Footer Technical Metadata */}
        <footer className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-mono opacity-30 uppercase tracking-[0.4em]">
          <div>T-COORD: {selectedEra.id.toUpperCase()} // LAT: 40.7128 N // LONG: 74.0060 W</div>
          <div>SYST_RECON: GEMINI // STATUS: PASS</div>
        </footer>
      </main>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

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


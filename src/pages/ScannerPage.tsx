import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { QrCode, MapPin, CheckCircle2, History, AlertCircle, ArrowLeft, StopCircle, Zap, Camera, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';

const MAX_DISTANCE_KM = 0.5;
const SCANNER_ELEMENT_ID = 'qr-reader-container';
const SCAN_COOLDOWN_MS = 800;      // Min gap between processing same QR
const MAX_RETRY_ATTEMPTS = 3;       // Camera init retries for AbortError
const RESULT_DISPLAY_MS = 1500;     // Show result then resume
const FACULTY_LOCATION_STALE_MIN = 10; // Faculty GPS data older than this (minutes) = stale

export function ScannerPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Core state
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const [gpsLocation, setGpsLocation] = useState<{lat: number, lng: number} | null>(null);
    const [campusCenter] = useState<{lat: number, lng: number}>({ lat: 17.5602548, lng: 78.4581462 }); // MRCE Maisammaguda, Hyderabad
    const [locError, setLocError] = useState('');
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [scanCount, setScanCount] = useState(0);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const mountedRef = useRef(true);
    const initializingRef = useRef(false);
    const lastScannedRef = useRef<string>('');
    const lastScanTimeRef = useRef<number>(0);
    const processingRef = useRef(false);

    const isFromDashboard = location.state?.from === 'dashboard';
    const backPath = isFromDashboard ? '/dashboard' : '/login';
    const backLabel = isFromDashboard ? 'Back to Dashboard' : 'Back to Login';

    // ── GPS ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setGpsLocation(coords);
                },
                (err) => setLocError(err?.message || 'Location unavailable'),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
            );
        } else {
            setLocError("Geolocation not supported");
        }
        loadRecentScans();
    }, []);

    // ── Cleanup ─────────────────────────────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []);

    const loadRecentScans = async () => {
        try {
            const { data } = await supabase
                .from('faculty_attendance_logs')
                .select('*, profiles:faculty_id(full_name)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (data && mountedRef.current) setRecentScans(data);
        } catch { /* silent */ }
    };

    // ── Haversine ───────────────────────────────────────────────────────
    const getDistanceFromCampus = (lat: number, lng: number) => {
        if (!campusCenter) return 0;
        const R = 6371;
        const dLat = (lat - campusCenter.lat) * (Math.PI / 180);
        const dLon = (lng - campusCenter.lng) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(campusCenter.lat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // ── Sound Feedback ──────────────────────────────────────────────────
    const playSound = (type: 'success' | 'error') => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (type === 'success') {
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(1175, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } else {
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch { /* silent */ }
    };

    // ── Stop Scanner ────────────────────────────────────────────────────
    const stopScanner = useCallback(async () => {
        try {
            if (scannerRef.current) {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        } catch {
            scannerRef.current = null;
        }
        if (mountedRef.current) setScanning(false);
    }, []);

    // ── Start Scanner with Retry Logic ──────────────────────────────────
    const startScanner = useCallback(async (attempt = 0) => {
        if (initializingRef.current || scannerRef.current?.isScanning) return;
        initializingRef.current = true;
        if (mountedRef.current) setCameraError(null);

        // Wait for DOM
        await new Promise(r => setTimeout(r, 300));

        const el = document.getElementById(SCANNER_ELEMENT_ID);
        if (!el || !mountedRef.current) {
            initializingRef.current = false;
            return;
        }

        // Clear any leftover DOM
        el.innerHTML = '';

        // If we have a stale ref, force cleanup
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch { /* ignore */ }
            scannerRef.current = null;
        }

        try {
            const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
                formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                verbose: false,
            });
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 20,
                    qrbox: 250,
                    disableFlip: false,
                },
                // ── CONTINUOUS SCAN HANDLER ──
                // Camera NEVER stops — we debounce duplicate scans and process in background
                (decodedText) => {
                    const now = Date.now();
                    const trimmed = decodedText.trim();

                    // Debounce: skip if same QR scanned within cooldown period
                    if (trimmed === lastScannedRef.current && (now - lastScanTimeRef.current) < SCAN_COOLDOWN_MS) {
                        return;
                    }

                    // Skip if we're still processing a previous scan
                    if (processingRef.current) return;

                    lastScannedRef.current = trimmed;
                    lastScanTimeRef.current = now;

                    // Process in background — camera keeps scanning
                    processScan(trimmed);
                },
                () => { /* QR detection frame miss — silent */ }
            );

            if (mountedRef.current) {
                setScanning(true);
                setRetryCount(0);
                setCameraError(null);
            }
        } catch (err: any) {
            scannerRef.current = null;
            const errorMsg = typeof err === 'string' ? err : err?.message || 'Unknown camera error';
            const isTimeout = errorMsg.includes('AbortError') || errorMsg.includes('Timeout') || errorMsg.includes('timeout');

            if (isTimeout && attempt < MAX_RETRY_ATTEMPTS && mountedRef.current) {
                // Retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.warn(`Camera timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`);
                if (mountedRef.current) setRetryCount(attempt + 1);
                initializingRef.current = false;
                await new Promise(r => setTimeout(r, delay));
                if (mountedRef.current) return startScanner(attempt + 1);
            } else if (mountedRef.current) {
                setScanning(false);
                setCameraError(errorMsg);
                toast.error("Camera error: " + errorMsg);
            }
        } finally {
            initializingRef.current = false;
        }
    }, []);

    // ── Auto-start ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!scanning && !initializingRef.current) {
            const timer = setTimeout(() => startScanner(), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    // ── Handle stop ─────────────────────────────────────────────────────
    const handleStop = async () => {
        await stopScanner();
        toast.info("Scanner stopped");
    };

    // ── Process Scan (runs in background, camera never stops) ──────────
    const processScan = async (scannedData: string) => {
        if (processingRef.current) return;
        processingRef.current = true;

        const facultyId = scannedData.trim();
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i;

        if (!uuidRegex.test(facultyId)) {
            playSound('error');
            toast.error("Invalid QR code — not a valid faculty ID.");
            setScanResult("❌ Invalid QR Code");
            setTimeout(() => { if (mountedRef.current) setScanResult(null); }, RESULT_DISPLAY_MS);
            processingRef.current = false;
            return;
        }

        // GPS is optional — don't block scans if location isn't available yet
        if (gpsLocation) {
            const distance = getDistanceFromCampus(gpsLocation.lat, gpsLocation.lng);
            if (distance > MAX_DISTANCE_KM) {
                playSound('error');
                toast.error(`Too far from scan zone (${distance.toFixed(2)}km).`);
                setScanResult('❌ Out of Zone');
                setTimeout(() => { if (mountedRef.current) setScanResult(null); }, RESULT_DISPLAY_MS);
                processingRef.current = false;
                return;
            }
        }

        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const nowISO = new Date().toISOString();
            const timeStr = format(new Date(), 'h:mm:ss a');

            const { data: facultyProfile } = await supabase
                .from('profiles')
                .select('full_name, last_lat, last_lng, last_location_at')
                .eq('id', facultyId)
                .single();
            const facultyName = facultyProfile?.full_name || `ID ${facultyId.slice(0, 8)}`;

            // ── FACULTY GPS VERIFICATION ──
            // Check if faculty's mobile app has reported their location
            let facultyGpsStatus: 'valid' | 'stale' | 'missing' | 'out_of_zone' = 'missing';
            if (facultyProfile?.last_lat && facultyProfile?.last_lng) {
                // Check staleness
                const locationAge = facultyProfile.last_location_at
                    ? (Date.now() - new Date(facultyProfile.last_location_at).getTime()) / 60000
                    : Infinity;
                
                if (locationAge > FACULTY_LOCATION_STALE_MIN) {
                    facultyGpsStatus = 'stale';
                } else {
                    // Verify distance from campus
                    const facultyDist = getDistanceFromCampus(facultyProfile.last_lat, facultyProfile.last_lng);
                    if (facultyDist > MAX_DISTANCE_KM) {
                        facultyGpsStatus = 'out_of_zone';
                        playSound('error');
                        toast.error(`${facultyName} is ${facultyDist.toFixed(2)}km from campus — scan blocked.`);
                        setScanResult(`❌ ${facultyName} — Off Campus`);
                        setTimeout(() => { if (mountedRef.current) setScanResult(null); }, RESULT_DISPLAY_MS);
                        processingRef.current = false;
                        return;
                    } else {
                        facultyGpsStatus = 'valid';
                    }
                }
            }

            // GPS status label for scan result
            const gpsLabel = facultyGpsStatus === 'stale' ? ' ⚠️' : facultyGpsStatus === 'valid' ? ' 📍' : '';

            const { data: existing } = await supabase
                .from('faculty_attendance_logs')
                .select('*')
                .eq('faculty_id', facultyId)
                .eq('date', today)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('faculty_attendance_logs')
                    .update({ check_out: nowISO })
                    .eq('id', existing.id);
                if (error) throw error;
                playSound('success');
                toast.success(`${facultyName} — Checked Out`, { description: `at ${timeStr}`, duration: 2000 });
                setScanResult(`✓ ${facultyName} — OUT${gpsLabel}`);
            } else {
                const { error } = await supabase
                    .from('faculty_attendance_logs')
                    .insert({
                        faculty_id: facultyId,
                        date: today,
                        check_in: nowISO,
                        status: 'present',
                        location_lat: gpsLocation?.lat ?? 0,
                        location_lng: gpsLocation?.lng ?? 0
                    });
                if (error) throw error;
                playSound('success');
                toast.success(`${facultyName} — Checked In`, { description: `at ${timeStr}`, duration: 2000 });
                setScanResult(`✓ ${facultyName} — IN${gpsLabel}`);
            }

            setScanCount(c => c + 1);
            loadRecentScans();
        } catch (err: any) {
            playSound('error');
            toast.error("Scan failed: " + err.message);
        } finally {
            // Brief display then clear — camera is STILL running so next scan is instant
            setTimeout(() => {
                if (mountedRef.current) {
                    setScanResult(null);
                    lastScannedRef.current = ''; // Allow re-scan of same QR if needed
                }
            }, RESULT_DISPLAY_MS);
            processingRef.current = false;
        }
    };

    return (
        <div className="space-y-5 animate-fade-in max-w-5xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        Faculty Scanner
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 tracking-widest uppercase">
                            <Zap className="inline h-3 w-3 mr-1" />Turbo
                        </span>
                    </h1>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">QR Attendance · 60+ scans/min</p>
                </div>
                <button
                    onClick={() => navigate(backPath)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground text-sm font-semibold transition-all border border-border/50 shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    {backLabel}
                </button>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 shadow-sm">
                    <div className="p-2 rounded-xl bg-emerald-500/10">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-foreground tabular-nums">{scanCount}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scans Today</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 shadow-sm">
                    <div className="p-2 rounded-xl bg-primary/10">
                        <Camera className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-foreground">{scanning ? 'ON' : 'OFF'}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Camera</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 shadow-sm">
                    <div className="p-2 rounded-xl bg-blue-500/10">
                        <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-2xl font-black text-foreground">{gpsLocation ? '✓' : '✗'}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GPS Lock</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Scanner Card */}
                <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden bg-card/60 backdrop-blur-xl">
                    <CardHeader className="bg-secondary/20 pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <QrCode className="w-5 h-5 text-primary" />
                                    Live QR Scanner
                                </CardTitle>
                                <CardDescription className="mt-1 text-xs">
                                    Continuous mode · Camera never stops · Just point and scan
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                {!scanning && (
                                    <Button size="sm" onClick={() => startScanner()} className="gap-1.5 rounded-xl">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Restart
                                    </Button>
                                )}
                                {scanning && (
                                    <Button variant="destructive" size="sm" onClick={handleStop} className="gap-1.5 rounded-xl">
                                        <StopCircle className="h-4 w-4" />
                                        Stop
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 relative">
                        {/* Ambient glow */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-b-3xl">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />
                        </div>

                        {/* Instructions */}
                        <div className="mb-3 text-center relative z-10">
                            <p className="text-xs text-muted-foreground font-medium">
                                📱 Point camera at faculty QR code · Detection is <span className="text-primary font-bold">instant</span> · No button needed
                            </p>
                        </div>

                        {/* Scanner Container */}
                        <div className="relative w-full overflow-hidden rounded-[1.5rem] border-2 border-primary/20 bg-black shadow-2xl transition-all duration-300" style={{ height: '340px' }}>
                            <div id={SCANNER_ELEMENT_ID} className="w-full h-full" />

                            {/* Camera Error State with Retry */}
                            {!scanning && !scanResult && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
                                    {cameraError ? (
                                        <>
                                            <AlertCircle className="w-10 h-10 text-red-400 mb-1" />
                                            <p className="text-xs text-red-300 text-center px-6 max-w-[280px]">{cameraError}</p>
                                            {retryCount > 0 && (
                                                <p className="text-[10px] text-muted-foreground">
                                                    Retried {retryCount}/{MAX_RETRY_ATTEMPTS} times
                                                </p>
                                            )}
                                            <Button onClick={() => { setCameraError(null); startScanner(); }} size="sm" className="rounded-xl mt-2 gap-1.5">
                                                <RefreshCw className="h-3.5 w-3.5" /> Try Again
                                            </Button>
                                            <p className="text-[10px] text-muted-foreground/60 max-w-[240px] text-center mt-1">
                                                Tip: Close other apps using camera. On Android, try Chrome browser.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-10 h-10 text-muted-foreground/40 mb-1" />
                                            <p className="text-sm text-muted-foreground">Camera stopped</p>
                                            <Button onClick={() => startScanner()} variant="default" size="sm" className="rounded-xl gap-1.5">
                                                <Camera className="h-3.5 w-3.5" /> Start Camera
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Scan Result Flash Overlay — brief flash, then camera resumes */}
                            {scanResult && (
                                <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center transition-all duration-200 ${
                                    scanResult.includes('❌') ? 'bg-red-950/80' : 'bg-emerald-950/80'
                                }`}>
                                    {scanResult.includes('❌') ? (
                                        <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
                                    ) : (
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                                    )}
                                    <h3 className="text-lg font-black text-white">{scanResult}</h3>
                                    <p className="text-[10px] text-white/50 mt-2 font-semibold uppercase tracking-widest">
                                        Auto-resuming scan...
                                    </p>
                                </div>
                            )}

                            {/* Scanning Laser */}
                            {scanning && !scanResult && (
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400 shadow-[0_0_15px_3px_rgba(52,211,153,0.7)] animate-scan-laser z-10 pointer-events-none" />
                            )}

                            {/* Live Badge */}
                            {scanning && (
                                <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                    </span>
                                    <span className="text-[9px] font-bold text-white uppercase tracking-widest">Live</span>
                                </div>
                            )}

                            {/* Corner Markers */}
                            {scanning && !scanResult && (
                                <div className="absolute inset-4 pointer-events-none z-10">
                                    <div className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-emerald-400/80 rounded-tl-lg" />
                                    <div className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-emerald-400/80 rounded-tr-lg" />
                                    <div className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-emerald-400/80 rounded-bl-lg" />
                                    <div className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-emerald-400/80 rounded-br-lg" />
                                </div>
                            )}
                        </div>

                        {/* GPS Status */}
                        <div className="flex items-center p-2.5 bg-secondary/30 rounded-xl mt-3 text-xs font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-orange-500 mr-2 shrink-0" />
                            {gpsLocation ? (
                                <span className="text-muted-foreground truncate flex-1">
                                    {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)}
                                </span>
                            ) : (
                                <span className="text-red-400 text-[11px]">{locError || 'Acquiring GPS...'}</span>
                            )}
                            {gpsLocation && (
                                <span className={`text-[10px] font-bold ml-auto pl-2 ${
                                    getDistanceFromCampus(gpsLocation.lat, gpsLocation.lng) <= MAX_DISTANCE_KM
                                        ? 'text-emerald-500' : 'text-red-500'
                                }`}>
                                    {getDistanceFromCampus(gpsLocation.lat, gpsLocation.lng) <= MAX_DISTANCE_KM ? '✓ Zone Valid' : '✗ Out of Zone'}
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Scans */}
                <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden bg-card/60 backdrop-blur-xl flex flex-col">
                    <CardHeader className="bg-secondary/20 pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <History className="w-5 h-5 text-amber-500" />
                            Recent Scans
                            {recentScans.length > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary ml-auto">
                                    {recentScans.length}
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 flex-1 overflow-auto max-h-[500px]">
                        {recentScans.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-12">
                                <History className="w-10 h-10 mb-3 opacity-20" />
                                <p className="text-sm font-semibold">No recent scans</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recentScans.map((scan, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-background/50 border border-border/30 transition-all hover:border-border/50">
                                        <div className={`p-2 rounded-xl shrink-0 ${scan.check_out ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                            {scan.check_out
                                                ? <ArrowLeft className="h-3.5 w-3.5 text-red-500" />
                                                : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-foreground text-sm truncate">
                                                {scan.profiles?.full_name || 'Unknown'}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                {format(new Date(scan.date), 'MMM d')} · {format(new Date(scan.check_out || scan.check_in), 'h:mm a')}
                                            </p>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            scan.check_out ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                            {scan.check_out ? 'OUT' : 'IN'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

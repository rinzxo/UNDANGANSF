import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Loader2, Search, X } from 'lucide-react';
import { QrReader } from 'react-qr-reader';
import { scanCheckIn } from '../api/client.js';

const FALLBACK_SNAPSHOT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const SCAN_LOCK_MS = 4500;
const DUPLICATE_LOCK_MS = 12000;
const SCAN_RESULT_THROTTLE_MS = 800;
const QR_STABLE_HITS = 3;
const QR_STABLE_MIN_MS = 420;
const QR_CANDIDATE_RESET_MS = 1400;

const defaultLensStatus = {
  phase: 'searching',
  label: 'Cari QR undangan',
  detail: 'Letakkan QR di tengah frame dan tahan sebentar.'
};

ensureCameraRegistryPatch();

export default function ReceptionistScanner() {
  const scannerRootRef = useRef(null);
  const processingRef = useRef(false);
  const scanLocksRef = useRef(new Map());
  const scanCandidateRef = useRef({ value: '', hits: 0, firstSeenAt: 0, lastSeenAt: 0 });
  const lastResultAtRef = useRef(0);
  const [lastScan, setLastScan] = useState('');
  const [manualInvitationId, setManualInvitationId] = useState('demo-vip-alya');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [duplicateCheckIn, setDuplicateCheckIn] = useState(null);
  const [lensStatus, setLensStatus] = useState(defaultLensStatus);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [showManualLookup, setShowManualLookup] = useState(false);

  useEffect(() => {
    setCameraReleaseRequested(false);
    const root = scannerRootRef.current;

    function releaseCamera() {
      releaseScannerCamera(root);
    }

    window.addEventListener('pagehide', releaseCamera);
    window.addEventListener('beforeunload', releaseCamera);
    window.addEventListener('wedding:release-camera', releaseCamera);

    return () => {
      window.removeEventListener('pagehide', releaseCamera);
      window.removeEventListener('beforeunload', releaseCamera);
      window.removeEventListener('wedding:release-camera', releaseCamera);
      releaseCamera();
    };
  }, []);

  function handleScanCandidate(rawInvitationId) {
    const invitationId = normalizeQrPayload(rawInvitationId || '');
    if (!invitationId) return;

    pruneExpiredScanLocks();

    const now = Date.now();
    const lockedUntil = scanLocksRef.current.get(invitationId) || 0;
    if (processingRef.current || lockedUntil > now) return;

    const current = scanCandidateRef.current;
    const isSameCandidate = current.value === invitationId && now - current.lastSeenAt < QR_CANDIDATE_RESET_MS;
    const nextCandidate = isSameCandidate
      ? {
          ...current,
          hits: current.hits + 1,
          lastSeenAt: now
        }
      : {
          value: invitationId,
          hits: 1,
          firstSeenAt: now,
          lastSeenAt: now
        };

    scanCandidateRef.current = nextCandidate;

    setLensStatus({
      phase: 'locking',
      label: `Mengunci QR (${Math.min(nextCandidate.hits, QR_STABLE_HITS)}/${QR_STABLE_HITS})`,
      detail: 'Jangan geser kamera sampai proses capture selesai.'
    });

    const isStable = nextCandidate.hits >= QR_STABLE_HITS && now - nextCandidate.firstSeenAt >= QR_STABLE_MIN_MS;
    if (!isStable) return;

    const imageBase64 = captureScannerFrame(scannerRootRef.current) || FALLBACK_SNAPSHOT;
    scanCandidateRef.current = { value: '', hits: 0, firstSeenAt: 0, lastSeenAt: 0 };
    setLensStatus({
      phase: 'verifying',
      label: 'QR terkunci',
      detail: 'Snapshot diambil. Data tamu sedang diverifikasi.'
    });
    processCheckIn(invitationId, 'auto', imageBase64);
  }

  async function processCheckIn(rawInvitationId, type = 'manual', capturedImageBase64 = '') {
    const invitationId = normalizeQrPayload(rawInvitationId || '');

    if (!invitationId) return;

    pruneExpiredScanLocks();

    const now = Date.now();
    const lockedUntil = scanLocksRef.current.get(invitationId) || 0;
    const isAutoThrottled = type === 'auto' && now - lastResultAtRef.current < SCAN_RESULT_THROTTLE_MS;

    if (processingRef.current || lockedUntil > now || isAutoThrottled) return;

    processingRef.current = true;
    scanLocksRef.current.set(invitationId, now + SCAN_LOCK_MS);
    lastResultAtRef.current = now;

    setProcessing(true);
    setLastScan(invitationId);
    setScanFeedback({
      type: 'verifying',
      eyebrow: 'Verifying guest',
      title: 'Memproses data tamu',
      message: type === 'manual'
        ? 'Manual lookup sedang dicek.'
        : 'QR terbaca jelas. Verifikasi sedang berjalan.',
      invitationId
    });
    if (type === 'manual') {
      setLensStatus({
        phase: 'verifying',
        label: 'Verifikasi manual',
        detail: 'Mengecek data tamu dari ID yang dimasukkan.'
      });
    }

    try {
      const imageBase64 = capturedImageBase64 || captureScannerFrame(scannerRootRef.current) || FALLBACK_SNAPSHOT;

      const data = await scanCheckIn({
        invitationId,
        imageBase64,
        type
      });

      setDuplicateCheckIn(null);
      setResult(data);
      setScanFeedback({
        type: 'success',
        eyebrow: 'Check-in berhasil',
        title: data.guestName || data.guest?.name || 'Tamu terverifikasi',
        message: `Status: ${data.currentStatus || 'checked-in'}`,
        invitationId: data.invitationId || invitationId
      });
      setLensStatus({
        phase: 'verified',
        label: 'Tamu terverifikasi',
        detail: data.guestName || data.guest?.name || 'Check-in berhasil.'
      });
      toast.success(`Guest checked in: ${data.currentStatus || 'checked-in'}`);
    } catch (err) {
      const duplicateDetails = err.response?.status === 409
        ? err.response?.data?.details
        : null;

      if (duplicateDetails?.code === 'ALREADY_CHECKED_IN') {
        scanLocksRef.current.set(invitationId, Date.now() + DUPLICATE_LOCK_MS);
        setDuplicateCheckIn(duplicateDetails);
        setResult(duplicateDetails);
        setScanFeedback({
          type: 'duplicate',
          eyebrow: 'Sudah check-in',
          title: duplicateDetails.guestName || duplicateDetails.guest?.name || 'QR sudah digunakan',
          message: 'QR ini sudah pernah digunakan. Tolak akses tamu ini jika orangnya tidak sesuai.',
          invitationId: duplicateDetails.invitationId || invitationId,
          checkedInAt: duplicateDetails.checkedInAt
        });
        setLensStatus({
          phase: 'duplicate',
          label: 'QR sudah digunakan',
          detail: 'Data duplicate terdeteksi. Lakukan konfirmasi penolakan jika perlu.'
        });
        toast.error('QR sudah pernah check-in');
        return;
      }

      setLensStatus({
        phase: 'searching',
        label: 'Verifikasi gagal',
        detail: 'Silakan arahkan QR lagi atau gunakan manual lookup.'
      });
      setScanFeedback({
        type: 'failed',
        eyebrow: 'Verifikasi gagal',
        title: 'QR tidak bisa diproses',
        message: err.response?.data?.error || err.message || 'Check-in failed',
        invitationId
      });
      toast.error(err.response?.data?.error || err.message || 'Check-in failed');
      window.setTimeout(() => {
        scanLocksRef.current.delete(invitationId);
        setLastScan('');
      }, 1800);
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }

  function confirmRejection() {
    if (!duplicateCheckIn) return;

    setResult({
      ...duplicateCheckIn,
      currentStatus: 'rejected',
      rejectedDuplicate: true
    });
    setScanFeedback({
      type: 'rejected',
      eyebrow: 'Akses ditolak',
      title: duplicateCheckIn.guestName || duplicateCheckIn.guest?.name || 'Duplicate QR',
      message: 'Penolakan sudah dikonfirmasi.',
      invitationId: duplicateCheckIn.invitationId
    });
    setDuplicateCheckIn(null);
    setLastScan('');
    scanCandidateRef.current = { value: '', hits: 0, firstSeenAt: 0, lastSeenAt: 0 };
    setLensStatus(defaultLensStatus);
    scanLocksRef.current.delete(duplicateCheckIn.invitationId);
    toast.success('Penolakan dikonfirmasi');
  }

  function resetDuplicateWarning() {
    setDuplicateCheckIn(null);
    setResult(null);
    setScanFeedback(null);
    setLastScan('');
    scanCandidateRef.current = { value: '', hits: 0, firstSeenAt: 0, lastSeenAt: 0 };
    setLensStatus(defaultLensStatus);
    if (duplicateCheckIn?.invitationId) {
      scanLocksRef.current.delete(duplicateCheckIn.invitationId);
    }
  }

  function pruneExpiredScanLocks() {
    const now = Date.now();
    scanLocksRef.current.forEach((expiresAt, key) => {
      if (expiresAt <= now) {
        scanLocksRef.current.delete(key);
      }
    });
  }

  function resetStaleScanCandidate() {
    const candidate = scanCandidateRef.current;
    if (!candidate.value || Date.now() - candidate.lastSeenAt < QR_CANDIDATE_RESET_MS) return;

    scanCandidateRef.current = { value: '', hits: 0, firstSeenAt: 0, lastSeenAt: 0 };
    if (!processingRef.current && !duplicateCheckIn) {
      setLensStatus(defaultLensStatus);
    }
  }

  async function handleManualLookupSubmit(event) {
    event.preventDefault();
    await processCheckIn(manualInvitationId, 'manual');
    setShowManualLookup(false);
  }

  return (
    <section ref={scannerRootRef} className="scanner-page mx-auto w-full max-w-6xl">
      <div className="scanner-topbar mb-7 grid grid-cols-[36px_1fr_36px] items-center gap-4">
        <button
          className="rounded-md p-2 transition hover:bg-white"
          aria-label="Close scanner"
          onClick={() => window.dispatchEvent(new Event('wedding:release-camera'))}
        >
          <X size={22} />
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Guest Check-In</p>
          <p className="scanner-mobile-hint mt-1 hidden text-[11px] text-ink/50">Scan seperti Google Lens</p>
        </div>
        <button
          className="justify-self-end rounded-md p-2 transition hover:bg-white"
          aria-label="Open manual lookup"
          onClick={() => setShowManualLookup(true)}
        >
          <Search size={21} />
        </button>
      </div>

      <div className="scanner-layout grid w-full justify-items-center gap-7 xl:grid-cols-[minmax(420px,560px)_340px] xl:items-start xl:justify-items-stretch">
        <div className="w-full max-w-[560px] min-w-0 xl:max-w-none">
          <div className="scanner-camera-card relative overflow-hidden rounded-lg border border-ink/15 bg-ink">
            <div className="scanner-video-frame aspect-square">
              <QrReader
                constraints={{ facingMode: 'environment' }}
                onResult={(scanResult, error) => {
                  if (scanResult?.text) {
                    handleScanCandidate(scanResult.text);
                  } else {
                    resetStaleScanCandidate();
                  }
                  if (error?.name && error.name !== 'NotFoundException') {
                    console.warn(error);
                  }
                }}
                videoStyle={{ borderRadius: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                containerStyle={{ width: '100%', height: '100%' }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-ink/30" />
            <div className="scanner-lens-top pointer-events-none absolute left-1/2 top-5 hidden -translate-x-1/2 rounded-full border border-white/20 bg-black/36 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/82 backdrop-blur-sm">
              QR Lens
            </div>
            <div className={`qr-lens-frame pointer-events-none absolute inset-[16%] ${lensStatus.phase}`} />
            <div className="scanner-lens-corner scanner-lens-corner-tl pointer-events-none" />
            <div className="scanner-lens-corner scanner-lens-corner-tr pointer-events-none" />
            <div className="scanner-lens-corner scanner-lens-corner-bl pointer-events-none" />
            <div className="scanner-lens-corner scanner-lens-corner-br pointer-events-none" />
            <div className="scanner-lens-instruction pointer-events-none absolute inset-x-5 bottom-5 rounded-md border border-white/20 bg-black/42 p-3 text-center text-white backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em]">{lensStatus.label}</p>
              <p className="mt-1 text-[11px] leading-5 text-white/72">{lensStatus.detail}</p>
            </div>
          </div>
        </div>

        {scanFeedback && (
          <div className="scanner-side-panel min-w-0 space-y-6">
            <ScanFeedbackCard
              feedback={scanFeedback}
              duplicateCheckIn={duplicateCheckIn}
              onConfirmRejection={confirmRejection}
              onResetDuplicate={resetDuplicateWarning}
            />
          </div>
        )}
      </div>

      {showManualLookup && (
        <ManualLookupDialog
          value={manualInvitationId}
          processing={processing}
          onChange={setManualInvitationId}
          onClose={() => setShowManualLookup(false)}
          onSubmit={handleManualLookupSubmit}
        />
      )}
    </section>
  );
}

function ScanFeedbackCard({ feedback, duplicateCheckIn, onConfirmRejection, onResetDuplicate }) {
  const Icon = getScanFeedbackIcon(feedback.type);

  return (
    <div className={`scanner-result-card rounded-lg border bg-white p-5 ${getScanFeedbackBorder(feedback.type)}`}>
      <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full border bg-white ${getScanFeedbackIconClass(feedback.type)}`}>
        <Icon size={18} className={feedback.type === 'verifying' ? 'app-notification-spinner' : ''} />
      </div>
      <div className="mt-4 text-center">
        <p className="eyebrow">{feedback.eyebrow}</p>
        <p className="mt-3 break-words font-display text-3xl leading-tight">
          {feedback.title}
        </p>
        <p className="mt-3 text-sm">{feedback.message}</p>
        {feedback.checkedInAt && (
          <p className="mt-2 text-xs text-ink/55">
            Check-in sebelumnya: {formatDateTime(feedback.checkedInAt)}
          </p>
        )}
        {feedback.invitationId && (
          <p className="mt-3 break-all text-xs uppercase tracking-[0.16em] text-ink/45">
            {feedback.invitationId}
          </p>
        )}
      </div>

      {duplicateCheckIn && (
        <div className="mt-5 grid gap-3">
          <button className="button-primary bg-red-700 hover:bg-red-800" onClick={onConfirmRejection}>
            Konfirmasi Penolakan
          </button>
          <button className="button-secondary" onClick={onResetDuplicate}>
            Batal / Scan Ulang
          </button>
        </div>
      )}
    </div>
  );
}

function ManualLookupDialog({ value, processing, onChange, onClose, onSubmit }) {
  return (
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="manual-lookup-title">
      <form className="app-dialog-card" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Manual lookup</p>
            <h2 id="manual-lookup-title" className="mt-3 font-display text-3xl leading-tight">
              Cek QR tanpa kamera
            </h2>
          </div>
          <button
            type="button"
            className="rounded-md border border-ink/15 p-2 transition hover:border-ink"
            onClick={onClose}
            aria-label="Tutup manual lookup"
            disabled={processing}
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-ink/62">
          Masukkan invitation ID atau paste isi QR untuk verifikasi manual.
        </p>

        <label className="relative mt-5 block">
          <input
            className="field field-icon-right min-w-0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter invitation ID or QR code"
            autoFocus
          />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/55" size={18} />
        </label>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <button type="button" className="button-secondary" onClick={onClose} disabled={processing}>
            Batal
          </button>
          <button className="button-primary" disabled={processing}>
            {processing ? 'Checking...' : 'Check In'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getScanFeedbackIcon(type) {
  if (type === 'success' || type === 'rejected') return CheckCircle2;
  if (type === 'verifying') return Loader2;
  return AlertTriangle;
}

function getScanFeedbackBorder(type) {
  if (type === 'duplicate' || type === 'failed') return 'border-red-500/45';
  if (type === 'success' || type === 'rejected') return 'border-moss/45';
  return 'border-ink/15';
}

function getScanFeedbackIconClass(type) {
  if (type === 'duplicate' || type === 'failed') return 'border-red-600 text-red-600';
  if (type === 'success' || type === 'rejected') return 'border-moss text-moss';
  return 'border-ink text-ink';
}

function normalizeQrPayload(payload) {
  try {
    const url = new URL(payload);
    return url.pathname.split('/').filter(Boolean).at(-1) || payload;
  } catch {
    return payload.trim();
  }
}

function captureScannerFrame(root) {
  const video = root?.querySelector('video');
  if (!video?.videoWidth || !video?.videoHeight) return '';

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) return '';

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

function formatDateTime(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function releaseScannerCamera(root) {
  setCameraReleaseRequested(true);
  stopVideoStreams(root);
  stopKnownCameraStreams();

  window.setTimeout(() => {
    stopVideoStreams(root);
    stopKnownCameraStreams();
  }, 100);

  window.setTimeout(() => {
    stopVideoStreams(root);
    stopKnownCameraStreams();
  }, 600);
}

function stopVideoStreams(root) {
  root?.querySelectorAll('video').forEach((video) => {
    video.pause?.();
    stopMediaStream(video.srcObject);
    video.srcObject = null;
    video.removeAttribute('src');
    video.load?.();
  });
}

function stopMediaStream(stream) {
  if (!stream || typeof stream.getTracks !== 'function') return;

  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function ensureCameraRegistryPatch() {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  if (window.__weddingCameraRegistryPatched) return;

  window.__weddingCameraRegistryPatched = true;
  window.__weddingCameraStreams = window.__weddingCameraStreams || new Set();
  window.__weddingReleaseCameraRequested = false;

  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async (...args) => {
    const stream = await originalGetUserMedia(...args);
    window.__weddingCameraStreams.add(stream);

    if (window.__weddingReleaseCameraRequested) {
      stopMediaStream(stream);
      window.__weddingCameraStreams.delete(stream);
    }

    return stream;
  };
}

function setCameraReleaseRequested(value) {
  if (typeof window === 'undefined') return;
  window.__weddingReleaseCameraRequested = value;
}

function stopKnownCameraStreams() {
  if (typeof window === 'undefined') return;

  window.__weddingCameraStreams?.forEach((stream) => {
    stopMediaStream(stream);
  });

  window.__weddingCameraStreams?.clear();
}

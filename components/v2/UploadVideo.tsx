'use client'

import { useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/client'

/**
 * Composant client pour uploader une vidéo MP4 vers Supabase Storage,
 * avec compression côté client via ffmpeg.wasm (lazy import) et
 * génération automatique d'un thumbnail JPEG.
 *
 * FLOW (séquentiel pour éviter les orphelins en cas de fail partiel) :
 *   1. Pre-check côté client (file.size <= 100 MB d'input, MIME vidéo)
 *   2. Lazy import @ffmpeg/ffmpeg + @ffmpeg/util (~25 MB, 1ère fois ~30s)
 *   3. Compression H.264 1080p 2 Mbps + AAC 128 kbps (-t maxDurationSeconds
 *      pour cropper si > cap palier)
 *   4. Génération thumbnail JPEG 720p à 1s
 *   5. Upload vidéo Supabase Storage → {user_id}/{nanoid}.mp4
 *   6. Upload thumbnail Storage → {user_id}/{nanoid}.jpg (best-effort)
 *   7. POST /api/videos/upload (validation palier server + INSERT BDD)
 *   8. onUploadComplete() callback pour refresh la liste UI
 *
 * Threading ffmpeg.wasm :
 *   Les routes où ce composant est monté (/dashboard/prestataire/fiche
 *   et /dashboard/lieu/[placeId]) ont les headers COOP/COEP scopés
 *   activés (cf next.config.js). ffmpeg.wasm utilise donc le mode
 *   multi-thread (3-5× plus rapide). Sur les browsers où
 *   crossOriginIsolated=false (Safari iOS < 16.4 par exemple), fallback
 *   single-thread automatique.
 *
 * ⚠️ Cap durée + count par palier sont validés CÔTÉ SERVEUR par
 * /api/videos/upload (defense in depth). Le client check juste le cap
 * durée pour cropper la vidéo avant compression — pas de validation
 * count côté client (pas critique, le serveur tranche).
 */

interface Props {
  /** XOR avec placeId : exactement un des deux. */
  profileId?: string
  placeId?: string
  /** UUID owner du fichier Storage (storage_owner_from_path mig 08). */
  userId: string
  /** Durée max autorisée pour cette fiche (60 Premium, 90 Cercle Pro). */
  maxDurationSeconds: number
  /** Callback après INSERT BDD réussie — la page parent rafraîchit la liste. */
  onUploadComplete?: () => void
  /** Callback en cas d'erreur (affichage UI à la page parent). */
  onError?: (message: string) => void
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'loading-ffmpeg'; firstTime: boolean }
  | { phase: 'compressing'; progress: number }
  | { phase: 'thumbnailing' }
  | { phase: 'uploading-video' }
  | { phase: 'uploading-thumbnail' }
  | { phase: 'inserting-db' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }

const MAX_INPUT_BYTES = 100 * 1024 * 1024 // 100 MB hard limit côté client
const ACCEPTED_MIMES = ['video/mp4', 'video/quicktime', 'video/webm']

// Cache partagé de ffmpeg pour éviter le recharger à chaque upload
// (lifetime = vie de la page React, reset au refresh).
let cachedFFmpeg: unknown = null

export function UploadVideo({
  profileId,
  placeId,
  userId,
  maxDurationSeconds,
  onUploadComplete,
  onError,
}: Props) {
  const [state, setState] = useState<UploadState>({ phase: 'idle' })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // XOR runtime check (TS ne peut pas l'imposer)
  if ((profileId && placeId) || (!profileId && !placeId)) {
    return (
      <p className="text-[12px] text-red-900">
        Erreur configuration UploadVideo : profile_id OU place_id requis.
      </p>
    )
  }

  const isUploading = state.phase !== 'idle' && state.phase !== 'error' && state.phase !== 'done'

  const reportError = (msg: string) => {
    setState({ phase: 'error', message: msg })
    onError?.(msg)
  }

  const handleFile = async (file: File) => {
    // ─── 1. Pre-check côté client ───────────────────────────────────
    if (!ACCEPTED_MIMES.includes(file.type)) {
      reportError(
        'Format non supporté. Utilise un .mp4, .mov ou .webm.',
      )
      return
    }
    if (file.size > MAX_INPUT_BYTES) {
      reportError(
        'Vidéo trop lourde (max 100 Mo en input). Compresse-la avant ou choisis un format plus court.',
      )
      return
    }

    try {
      // ─── 2. Lazy import + load ffmpeg ──────────────────────────────
      const isFirstTime = cachedFFmpeg === null
      setState({ phase: 'loading-ffmpeg', firstTime: isFirstTime })

      // Dynamic imports — ffmpeg.wasm core (~25 MB) chargé à la demande
      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
        import('@ffmpeg/ffmpeg'),
        import('@ffmpeg/util'),
      ])

      type FFmpegInstance = InstanceType<typeof FFmpeg>
      let ffmpeg: FFmpegInstance
      if (cachedFFmpeg) {
        ffmpeg = cachedFFmpeg as FFmpegInstance
      } else {
        ffmpeg = new FFmpeg()

        // Charge le core depuis unpkg (CSP: connect-src étendu dans
        // next.config.js pour autoriser unpkg.com). Single-thread par
        // défaut — le multi-thread requiert @ffmpeg/core-mt qui n'est
        // pas encore stable sur tous les navigateurs.
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        cachedFFmpeg = ffmpeg
      }

      // ─── 3. Compression vidéo ──────────────────────────────────────
      setState({ phase: 'compressing', progress: 0 })

      const onProgress = (e: { progress: number }) => {
        setState({
          phase: 'compressing',
          progress: Math.min(100, Math.max(0, Math.round(e.progress * 100))),
        })
      }
      ffmpeg.on('progress', onProgress)

      const inputName = `input.${file.name.split('.').pop()?.toLowerCase() || 'mp4'}`
      const compressedName = 'output.mp4'
      const thumbName = 'thumb.jpg'

      await ffmpeg.writeFile(inputName, await fetchFile(file))

      // -t = crop durée à maxDurationSeconds. -c:v libx264 -preset fast
      // -b:v 2M = 2 Mbps video. -c:a aac -b:a 128k. -vf scale=-2:1080
      // pour borner hauteur 1080p (largeur calculée en preserving ratio).
      await ffmpeg.exec([
        '-i', inputName,
        '-t', String(maxDurationSeconds),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-b:v', '2M',
        '-vf', 'scale=-2:1080',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        compressedName,
      ])

      // ─── 4. Génération thumbnail JPEG (frame à 1s, 720p) ──────────
      setState({ phase: 'thumbnailing' })
      try {
        await ffmpeg.exec([
          '-i', compressedName,
          '-ss', '00:00:01',
          '-frames:v', '1',
          '-vf', 'scale=-2:720',
          '-q:v', '4',
          thumbName,
        ])
      } catch {
        // Best-effort : si la génération thumbnail fail, on continue
        // sans thumbnail (la vidéo reste utilisable).
      }
      ffmpeg.off('progress', onProgress)

      // Lit les fichiers compressés depuis le FS virtuel ffmpeg
      const compressedData = await ffmpeg.readFile(compressedName)
      const compressedBlob = new Blob([compressedData as Uint8Array], {
        type: 'video/mp4',
      })

      let thumbnailBlob: Blob | null = null
      try {
        const thumbData = await ffmpeg.readFile(thumbName)
        thumbnailBlob = new Blob([thumbData as Uint8Array], { type: 'image/jpeg' })
      } catch {
        thumbnailBlob = null
      }

      // Récupère la durée réelle de la vidéo compressée (peut être
      // < maxDurationSeconds si la source était plus courte).
      const probedDuration = await probeVideoDuration(compressedBlob)
      const finalDuration = Math.min(
        Math.max(1, Math.round(probedDuration)),
        maxDurationSeconds,
      )

      const finalSize = compressedBlob.size
      if (finalSize > 50 * 1024 * 1024) {
        reportError(
          'La vidéo compressée dépasse 50 Mo. Choisis une vidéo plus courte ou de qualité plus basse.',
        )
        return
      }

      // ─── 5. Upload vidéo Supabase Storage ──────────────────────────
      setState({ phase: 'uploading-video' })
      const supabase = createClient()
      const bucket = profileId ? 'profile-videos' : 'place-videos'
      const videoNanoid = nanoid()
      const thumbNanoid = nanoid()
      const videoStoragePath = `${userId}/${videoNanoid}.mp4`
      const thumbStoragePath = `${userId}/${thumbNanoid}.jpg`

      const videoUpload = await supabase.storage
        .from(bucket)
        .upload(videoStoragePath, compressedBlob, {
          cacheControl: '3600',
          contentType: 'video/mp4',
        })
      if (videoUpload.error) {
        reportError(`Upload vidéo échoué : ${videoUpload.error.message}`)
        return
      }

      // ─── 6. Upload thumbnail (best-effort) ─────────────────────────
      let thumbnailFinalPath: string | null = null
      if (thumbnailBlob) {
        setState({ phase: 'uploading-thumbnail' })
        const thumbUpload = await supabase.storage
          .from(bucket)
          .upload(thumbStoragePath, thumbnailBlob, {
            cacheControl: '3600',
            contentType: 'image/jpeg',
          })
        if (!thumbUpload.error) {
          thumbnailFinalPath = thumbStoragePath
        }
      }

      // ─── 7. INSERT BDD via API route (validation palier server) ────
      setState({ phase: 'inserting-db' })
      const apiBody: Record<string, unknown> = {
        storage_path: videoStoragePath,
        thumbnail_storage_path: thumbnailFinalPath,
        duration_seconds: finalDuration,
        size_bytes: finalSize,
      }
      if (profileId) apiBody.profile_id = profileId
      if (placeId) apiBody.place_id = placeId

      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        reportError(
          (json?.error as string) ||
            "L'enregistrement de la vidéo a échoué. Réessaie.",
        )
        return
      }

      // ─── 8. Done ───────────────────────────────────────────────────
      setState({ phase: 'done' })
      onUploadComplete?.()

      // Reset après 2s
      setTimeout(() => setState({ phase: 'idle' }), 2000)

      // Cleanup FS virtuel ffmpeg pour libérer mémoire
      try {
        await ffmpeg.deleteFile(inputName)
        await ffmpeg.deleteFile(compressedName)
        await ffmpeg.deleteFile(thumbName)
      } catch {
        // Best-effort
      }
    } catch (err) {
      reportError(
        err instanceof Error
          ? `Erreur compression : ${err.message}`
          : 'Erreur inattendue pendant la compression.',
      )
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MIMES.join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          // Reset input pour permettre un re-upload du même fichier
          if (e.target) e.target.value = ''
        }}
        disabled={isUploading}
      />

      {state.phase === 'idle' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-or/40 bg-blanc px-6 text-[11px] font-medium tracking-[0.22em] text-vert uppercase transition-all hover:border-or hover:bg-creme-soft"
        >
          + Ajouter une vidéo
          <span className="text-or" aria-hidden="true">→</span>
        </button>
      )}

      {state.phase === 'loading-ffmpeg' && (
        <div className="rounded-sm border border-or/30 bg-creme-soft px-4 py-3">
          <p className="font-serif text-[15px] italic text-vert">
            {state.firstTime
              ? 'Première fois ? Hilmy charge l\'outil de compression vidéo (~30s)…'
              : 'Préparation de la compression…'}
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-or/20">
            <div className="h-full w-1/3 animate-pulse bg-or" />
          </div>
        </div>
      )}

      {state.phase === 'compressing' && (
        <div className="rounded-sm border border-or/30 bg-creme-soft px-4 py-3">
          <p className="font-serif text-[15px] italic text-vert">
            Compression en cours… {state.progress}%
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-or/20">
            <div
              className="h-full bg-or transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {state.phase === 'thumbnailing' && (
        <p className="text-[13px] italic text-texte-sec">
          Préparation du visuel d&apos;aperçu…
        </p>
      )}

      {state.phase === 'uploading-video' && (
        <p className="text-[13px] italic text-texte-sec">
          Envoi de la vidéo sur Hilmy…
        </p>
      )}

      {state.phase === 'uploading-thumbnail' && (
        <p className="text-[13px] italic text-texte-sec">
          Envoi du visuel d&apos;aperçu…
        </p>
      )}

      {state.phase === 'inserting-db' && (
        <p className="text-[13px] italic text-texte-sec">
          Finalisation…
        </p>
      )}

      {state.phase === 'done' && (
        <p className="rounded-sm border border-or/30 bg-or/10 px-3 py-2 text-[13px] text-vert">
          ✓ Vidéo ajoutée. Elle apparaît sur ta fiche publique.
        </p>
      )}

      {state.phase === 'error' && (
        <div className="rounded-sm border border-red-900/20 bg-red-900/5 px-3 py-2">
          <p className="text-[13px] text-red-900">{state.message}</p>
          <button
            type="button"
            onClick={() => setState({ phase: 'idle' })}
            className="mt-2 text-[11px] tracking-[0.22em] text-or-deep uppercase hover:text-or"
          >
            Réessayer →
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Probe la durée réelle d'une vidéo via un <video> element invisible.
 * Plus rapide que de re-parser via ffmpeg, fonctionne en natif browser.
 * Fallback à 0 si le probing fail (rare, mais possible).
 */
async function probeVideoDuration(blob: Blob): Promise<number> {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(blob)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const d = video.duration
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(d) ? d : 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Music,
  Upload,
  HardDrive,
  Loader2,
} from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';
import { saveAudioFile, getAudioFile, deleteAudioFile } from '../utils/audioStorage';

// ── Types ────────────────────────────────────────────────────────
interface Track {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'spotify' | 'other' | 'local';
  fileName?: string;
  fileSize?: number;
}

interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Ambient Music',
    url: 'https://www.youtube.com/watch?v=Qo4JIT8jMtI',
    type: 'youtube',
  },
  {
    id: '2',
    title: 'Lofi Study Music',
    url: 'https://www.youtube.com/watch?v=53gNFOqDFcE',
    type: 'youtube',
  },
  {
    id: '3',
    title: 'Classical Music',
    url: 'https://www.youtube.com/watch?v=BMuknRb7woc',
    type: 'youtube',
  },
];

const DEFAULT_PLAYLIST: Playlist = {
  id: 'default-playlist',
  name: 'Study Vibes',
  tracks: DEFAULT_TRACKS,
};

// ── Helpers ──────────────────────────────────────────────────────
function determineTrackType(url: string): 'youtube' | 'spotify' | 'other' {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  return 'other';
}

/** Source logo icon for YouTube / Spotify */
function SourceIcon({ type }: { type: Track['type'] }) {
  if (type === 'youtube') {
    return <img className="music-source-icon" src="/yotube.png" alt="YouTube" />;
  }
  if (type === 'spotify') {
    return <img className="music-source-icon" src="/spotify.png" alt="Spotify" />;
  }
  if (type === 'local') {
    return <HardDrive size={14} className="music-source-icon-fallback" />;
  }
  return <Music size={14} className="music-source-icon-fallback" />;
}

/** Fluid waveform animation component */
function FluidWaveform({ paused, small }: { paused?: boolean; small?: boolean }) {
  const bars = [
    { id: 0, height: '60%', duration: 0.9, values: [0.3, 1.1, 0.4, 0.9, 0.3] },
    { id: 1, height: '100%', duration: 1.3, values: [0.2, 1.2, 0.3, 1.1, 0.2] },
    { id: 2, height: '60%', duration: 1.0, values: [0.4, 1.0, 0.3, 0.8, 0.4] },
  ];

  return (
    <div
      className={`music-waveform ${small ? 'music-waveform--small' : ''}`}
    >
      {bars.map((bar) => (
        <motion.span
          key={bar.id}
          className="music-waveform-bar"
          style={{ height: bar.height }}
          animate={paused ? { scaleY: 0.3 } : { scaleY: bar.values }}
          transition={
            paused
              ? { duration: 0.2 }
              : {
                  duration: bar.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────
export function MusicPlayerDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  // Playlists state via localStorage
  const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('ojee_playlists', [
    DEFAULT_PLAYLIST,
  ]);
  const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string>(
    'ojee_active_playlist',
    DEFAULT_PLAYLIST.id
  );
  const [tooltipDismissed, setTooltipDismissed] = useLocalStorage<boolean>(
    'fab_tooltip_dismissed_music',
    false
  );

  // UI State
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Player state
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(false);
  const [showSpotifyEmbed, setShowSpotifyEmbed] = useState(true);
  const [localObjectUrl, setLocalObjectUrl] = useState<string | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  // Refs
  const createInputRef = useRef<HTMLInputElement>(null);
  const addTrackUrlRef = useRef<HTMLInputElement>(null);

  // Derived State
  const activePlaylist = useMemo(() => {
    return playlists.find((p) => p.id === activePlaylistId) || playlists[0] || DEFAULT_PLAYLIST;
  }, [playlists, activePlaylistId]);

  const playlistOptions = useMemo(() => {
    return playlists.map((p) => ({
      value: p.id,
      label: p.name,
    }));
  }, [playlists]);

  const currentTrack = activePlaylist.tracks[currentTrackIndex] || activePlaylist.tracks[0];
  const isSpotify = currentTrack?.type === 'spotify';

  // ── Drawer Controls ──────────────────────────────────────────
  const toggleOpen = () => setIsOpen((prev) => !prev);
  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Auto-focus inputs when collapsible sections open
  useEffect(() => {
    if (showCreatePlaylist && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [showCreatePlaylist]);

  useEffect(() => {
    if (showAddTrack && addTrackUrlRef.current) {
      addTrackUrlRef.current.focus();
    }
  }, [showAddTrack]);

  useEffect(() => {
    setShowSpotifyEmbed(true);
    setIsBuffering(false);
  }, [currentTrackIndex, activePlaylistId]);

  // Handle local track playback URL
  useEffect(() => {
    if (!currentTrack || currentTrack.type !== 'local') {
      setLocalObjectUrl(null);
      return;
    }

    let isActive = true;

    getAudioFile(currentTrack.id)
      .then((blob) => {
        if (!isActive || !blob) return;
        const url = URL.createObjectURL(blob);
        setLocalObjectUrl(url);
      })
      .catch((err) => {
        console.error('Failed to load local track:', err);
      });

    return () => {
      isActive = false;
    };
  }, [currentTrack]);

  // Revoke object URL when it changes or unmounts
  useEffect(() => {
    return () => {
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [localObjectUrl]);

  // ── Playlist Management ──────────────────────────────────────
  const handleAddPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      tracks: [],
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
    setNewPlaylistName('');
    setCurrentTrackIndex(0);
    setShowCreatePlaylist(false);
  };

  const handleDeletePlaylist = () => {
    if (playlists.length <= 1) return;

    // Cleanup local storage for tracks in this playlist
    activePlaylist.tracks.forEach((t) => {
      if (t.type === 'local') {
        deleteAudioFile(t.id).catch(console.error);
      }
    });

    setPlaylists((prev) => prev.filter((p) => p.id !== activePlaylistId));
    setActivePlaylistId(playlists[0].id);
    setCurrentTrackIndex(0);
  };

  // ── Track Management ─────────────────────────────────────────
  const handleAddTrack = () => {
    if (!newTrackUrl.trim()) return;
    const type = determineTrackType(newTrackUrl);
    const title = newTrackTitle.trim() || (type === 'spotify' ? 'Spotify Track' : 'New Track');

    const newTrack: Track = {
      id: Date.now().toString(),
      title,
      url: newTrackUrl.trim(),
      type,
    };

    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === activePlaylist.id) {
          return { ...p, tracks: [...p.tracks, newTrack] };
        }
        return p;
      })
    );

    setNewTrackUrl('');
    setNewTrackTitle('');
    setShowAddTrack(false);
  };

  const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const trackToDelete = activePlaylist.tracks.find((t) => t.id === trackId);
    if (trackToDelete?.type === 'local') {
      deleteAudioFile(trackId).catch(console.error);
    }

    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === activePlaylist.id) {
          return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
        }
        return p;
      })
    );
    const deletedIndex = activePlaylist.tracks.findIndex((t) => t.id === trackId);
    if (deletedIndex === currentTrackIndex) {
      setPlaying(false);
    } else if (deletedIndex < currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleAddLocalFile(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleAddLocalFile(file);
    }
  };

  const handleAddLocalFile = async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file.');
      return;
    }

    setIsSavingLocal(true);
    const trackId = Date.now().toString();
    try {
      await saveAudioFile(trackId, file);

      const newTrack: Track = {
        id: trackId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: trackId,
        type: 'local',
        fileName: file.name,
        fileSize: file.size,
      };

      setPlaylists((prev) =>
        prev.map((p) => {
          if (p.id === activePlaylist.id) {
            return { ...p, tracks: [...p.tracks, newTrack] };
          }
          return p;
        })
      );

      setShowAddTrack(false);
    } catch (error) {
      console.error('Error saving local file:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please free up some space or remove older tracks.');
      } else {
        alert('Failed to save audio file to local storage.');
      }
    } finally {
      setIsSavingLocal(false);
    }
  };

  // ── Playback Controls ────────────────────────────────────────
  const handlePlayPause = () => setPlaying(!playing);

  const handleNext = useCallback(() => {
    if (activePlaylist.tracks.length === 0) return;
    if (currentTrackIndex < activePlaylist.tracks.length - 1) {
      setCurrentTrackIndex((prev) => prev + 1);
    } else if (loop) {
      setCurrentTrackIndex(0);
    } else {
      setPlaying(false);
    }
  }, [activePlaylist, currentTrackIndex, loop]);

  const handlePrev = () => {
    if (activePlaylist.tracks.length === 0) return;
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((prev) => prev - 1);
    } else if (loop) {
      setCurrentTrackIndex(activePlaylist.tracks.length - 1);
    }
  };

  const handleTrackEnded = () => {
    handleNext();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    if (muted) setMuted(false);
  };

  // Helper to get Spotify iframe URL
  const getSpotifyEmbedUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('spotify.com')) {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
          return `https://open.spotify.com/embed/${pathParts[0]}/${pathParts[1]}?utm_source=generator`;
        }
      }
    } catch {
      // Invalid URL
    }
    return url;
  };

  return (
    <>
      {/* Hidden ReactPlayer for audio streams */}
      {currentTrack && !isSpotify && (
        <ReactPlayer
          src={currentTrack.type === 'local' ? localObjectUrl || undefined : currentTrack.url}
          playing={playing}
          volume={volume}
          muted={muted}
          loop={false}
          onEnded={handleTrackEnded}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onPlay={() => setIsBuffering(false)}
          onError={() => setIsBuffering(false)}
          onReady={() => setIsBuffering(false)}
          width="0"
          height="0"
          style={{ display: 'none' }}
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              className="music-overlay music-overlay--visible"
              onClick={handleClose}
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />

            {/* Drawer */}
            <motion.div
              className="music-drawer"
              role="dialog"
              aria-modal="true"
              initial={isMobile ? { y: '100%', x: 0 } : { x: '-100%', y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={isMobile ? { y: '100%', x: 0 } : { x: '-100%', y: 0 }}
              transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
            >
        {/* ─── Header ─────────────────────────────────────── */}
        <div className="music-header">
          <div className="music-header-title">
            <img className="music-header-icon" src="/musicBot.png" alt="Music" />
            Music player
          </div>
          <button className="music-close-btn" onClick={handleClose} aria-label="Close music player">
            <X size={14} />
          </button>
        </div>

        {/* ─── Playlists Header ───────────────────────────── */}
        <div className="music-section-header">
          <span className="music-section-label">Playlists · {playlists.length}</span>
          <button
            className={`music-playlist-action-btn music-playlist-action-btn--accent ${showCreatePlaylist ? 'music-playlist-action-btn--toggled' : ''}`}
            onClick={() => setShowCreatePlaylist((prev) => !prev)}
            title="Create playlist"
            aria-label="Create new playlist"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* ─── Collapsible Create Playlist ────────────────── */}
        <AnimatePresence initial={false}>
          {showCreatePlaylist && (
            <motion.div
              className="music-create-playlist"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="music-create-playlist-inner">
                <input
                  ref={createInputRef}
                  type="text"
                  placeholder="Playlist name"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPlaylist()}
                />
                <button
                  className="music-create-btn"
                  onClick={handleAddPlaylist}
                  disabled={!newPlaylistName.trim()}
                >
                  Create
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Playlist Bar ───────────────────────────────── */}
        <div className="music-playlist-bar">
          <CustomSelect
            value={activePlaylistId}
            options={playlistOptions}
            onChange={(val) => {
              setActivePlaylistId(val);
              setCurrentTrackIndex(0);
              setPlaying(false);
            }}
          />
          <button
            className="music-playlist-action-btn music-playlist-action-btn--danger"
            onClick={handleDeletePlaylist}
            disabled={playlists.length <= 1}
            title="Delete playlist"
            aria-label="Delete current playlist"
          >
            <Trash2 size={14} />
          </button>
        </div>



        {/* ─── Track List Header + Add button ────────────── */}
        <div className="music-section-header">
          <span className="music-section-label">Tracks · {activePlaylist.tracks.length}</span>
          <button
            className={`music-playlist-action-btn music-playlist-action-btn--accent ${showAddTrack ? 'music-playlist-action-btn--toggled' : ''}`}
            onClick={() => setShowAddTrack((prev) => !prev)}
            title="Add track"
            aria-label="Add new track"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* ─── Collapsible Add Track ───────────────────────── */}
        <AnimatePresence initial={false}>
          {showAddTrack && (
            <motion.div
              className="music-add-track-collapse"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="music-add-track-inner">
                <input
                  type="text"
                  placeholder="Track name (optional)"
                  value={newTrackTitle}
                  onChange={(e) => setNewTrackTitle(e.target.value)}
                />
                <div className="music-add-track-url-row">
                  <input
                    ref={addTrackUrlRef}
                    type="text"
                    placeholder="YouTube or Spotify URL"
                    value={newTrackUrl}
                    onChange={(e) => setNewTrackUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
                  />
                  <button
                    className="music-create-btn"
                    onClick={handleAddTrack}
                    disabled={!newTrackUrl.trim()}
                  >
                    Add
                  </button>
                </div>

                <div className="music-add-track-divider">
                  <span>or</span>
                </div>

                <div
                  className="music-local-upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    id="music-local-upload"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="music-local-upload" className="music-local-upload-label">
                    {isSavingLocal ? (
                      <>
                        <Loader2 size={16} className="music-spinner" />
                        <span>Saving to device...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>Click or drag audio file here</span>
                        <span className="music-upload-hint">Works offline</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Track List ─────────────────────────────────── */}
        <div className="music-track-list">
          {activePlaylist.tracks.length === 0 ? (
            <div className="music-empty-state">
              <div className="music-empty-state-icon">
                <Music size={20} />
              </div>
              <div className="music-empty-state-text">No tracks yet</div>
              <div className="music-empty-state-hint">
                Tap <strong>+</strong> above to add a YouTube or Spotify URL
              </div>
            </div>
          ) : (
            activePlaylist.tracks.map((track, idx) => {
              const isActive = idx === currentTrackIndex;
              return (
                <div
                  key={track.id}
                  className={`music-track-item ${isActive ? 'music-track-item--active' : ''}`}
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    setPlaying(true);
                  }}
                >
                  <span className="music-track-number">
                    {isActive && playing ? <FluidWaveform paused={isBuffering} small /> : idx + 1}
                  </span>
                  <span className="music-track-title">{track.title}</span>
                  <SourceIcon type={track.type} />
                  <div className="music-track-actions">
                    <button
                      className="music-track-delete-btn"
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      aria-label={`Delete ${track.title}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ─── Now Playing (compact row) ──────────────────── */}
        {currentTrack && (
          <div className="music-now-playing">
            <FluidWaveform paused={!playing || isBuffering} small />
            <span className="music-now-playing-title">{currentTrack.title}</span>
            <SourceIcon type={currentTrack.type} />
          </div>
        )}

        {/* ─── Spotify Embedded Player ─────────────────────── */}
        {currentTrack && isSpotify && showSpotifyEmbed && (
          <div className="music-spotify-embed">
            <div className="music-spotify-header">
              <span className="music-spotify-title">Spotify Playback</span>
              <button
                className="music-spotify-close-btn"
                onClick={() => {
                  setPlaying(false);
                  setShowSpotifyEmbed(false);
                }}
                aria-label="Close Spotify player"
                title="Close player"
              >
                <X size={14} />
              </button>
            </div>
            <iframe
              src={getSpotifyEmbedUrl(currentTrack.url)}
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        )}

        {/* ─── Player Dock ─────────────────────────────────── */}
        {(!isSpotify || !currentTrack || !showSpotifyEmbed) && (
          <div className="music-dock">
            <div className="music-dock-row">
              {/* Volume — left side, upward popup slider */}
              <div className="music-dock-volume">
                <button
                  className="music-dock-btn"
                  onClick={() => setMuted(!muted)}
                  aria-label="Toggle mute"
                >
                  {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <div className="music-dock-volume-popup">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step="any"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="music-volume-slider"
                    aria-label="Volume"
                    style={
                      { '--volume-fill': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties
                    }
                  />
                </div>
              </div>

              {/* Centered playback controls */}
              <div className="music-dock-center">
                <button className="music-dock-btn" onClick={handlePrev} disabled={!currentTrack}>
                  <SkipBack size={18} />
                </button>
                <button
                  className="music-dock-play"
                  onClick={handlePlayPause}
                  disabled={!currentTrack}
                >
                  {isBuffering ? (
                    <Loader2 size={20} className="music-spinner" />
                  ) : playing ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" />
                  )}
                </button>
                <button className="music-dock-btn" onClick={handleNext} disabled={!currentTrack}>
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Repeat — right side */}
              <button
                className={`music-dock-btn ${loop ? 'music-dock-btn--active' : ''}`}
                onClick={() => setLoop(!loop)}
              >
                <Repeat size={16} />
              </button>
            </div>
          </div>
        )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB Toggle */}
      {!isOpen && (
        <button
          className="music-fab"
          onClick={toggleOpen}
          aria-label="Open music player"
          title="Music player"
        >
          <span className="music-fab-icon">
            <img src="/musicBot.png" alt="Music" />
          </span>
          {!tooltipDismissed && (
            <div
              className="fab-info-tooltip fab-info-tooltip--left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fab-info-tooltip-text">You can disable this feature in Settings.</div>
              <button
                className="fab-info-tooltip-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setTooltipDismissed(true);
                }}
                aria-label="Dismiss tooltip"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </button>
      )}
    </>
  );
}

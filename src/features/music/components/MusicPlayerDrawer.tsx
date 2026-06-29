import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactPlayer from 'react-player';
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
    ListMusic,
    ChevronDown
} from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';
import { CustomSelect } from '../../../shared/components/ui/CustomSelect';

// ── Types ────────────────────────────────────────────────────────
interface Track {
    id: string;
    title: string;
    url: string;
    type: 'youtube' | 'spotify' | 'other';
}

interface Playlist {
    id: string;
    name: string;
    tracks: Track[];
}

const DEFAULT_TRACKS: Track[] = [
    { id: '1', title: 'Ambient Music', url: 'https://www.youtube.com/watch?v=Qo4JIT8jMtI', type: 'youtube' },
    { id: '2', title: 'Lofi Study Music', url: 'https://www.youtube.com/watch?v=53gNFOqDFcE', type: 'youtube' },
    { id: '3', title: 'Classical Music', url: 'https://www.youtube.com/watch?v=BMuknRb7woc', type: 'youtube' }
];

const DEFAULT_PLAYLIST: Playlist = {
    id: 'default-playlist',
    name: 'Study Vibes',
    tracks: DEFAULT_TRACKS
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
    return <Music size={14} className="music-source-icon-fallback" />;
}

/** Tiny equalizer bars component */
function EqBars({ paused, small }: { paused?: boolean; small?: boolean }) {
    const className = small
        ? `music-track-eq ${paused ? 'music-track-eq--paused' : ''}`
        : `music-now-playing-eq ${paused ? 'music-now-playing-eq--paused' : ''}`;
    return (
        <div className={className}>
            <div className="music-eq-bar" />
            <div className="music-eq-bar" />
            <div className="music-eq-bar" />
            <div className="music-eq-bar" />
        </div>
    );
}

// ── Component ─────────────────────────────────────────────────────
export function MusicPlayerDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    
    // Playlists state via localStorage
    const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('ojee_playlists', [DEFAULT_PLAYLIST]);
    const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string>('ojee_active_playlist', DEFAULT_PLAYLIST.id);
    
    // UI State
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newTrackUrl, setNewTrackUrl] = useState('');
    const [newTrackTitle, setNewTrackTitle] = useState('');
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [showAddTrack, setShowAddTrack] = useState(false);

    // Player state
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [muted, setMuted] = useState(false);
    const [loop, setLoop] = useState(false);
    const [showSpotifyEmbed, setShowSpotifyEmbed] = useState(true);

    // Refs
    const createInputRef = useRef<HTMLInputElement>(null);
    const addTrackUrlRef = useRef<HTMLInputElement>(null);

    // Derived State
    const activePlaylist = useMemo(() => {
        return playlists.find(p => p.id === activePlaylistId) || playlists[0] || DEFAULT_PLAYLIST;
    }, [playlists, activePlaylistId]);

    const playlistOptions = useMemo(() => {
        return playlists.map(p => ({
            value: p.id,
            label: p.name
        }));
    }, [playlists]);

    const currentTrack = activePlaylist.tracks[currentTrackIndex] || activePlaylist.tracks[0];
    const isSpotify = currentTrack?.type === 'spotify';

    // ── Drawer Controls ──────────────────────────────────────────
    const toggleOpen = () => setIsOpen(prev => !prev);
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
    }, [currentTrackIndex, activePlaylistId]);

    // ── Playlist Management ──────────────────────────────────────
    const handleAddPlaylist = () => {
        if (!newPlaylistName.trim()) return;
        const newPlaylist: Playlist = {
            id: Date.now().toString(),
            name: newPlaylistName.trim(),
            tracks: []
        };
        setPlaylists(prev => [...prev, newPlaylist]);
        setActivePlaylistId(newPlaylist.id);
        setNewPlaylistName('');
        setCurrentTrackIndex(0);
        setShowCreatePlaylist(false);
    };

    const handleDeletePlaylist = () => {
        if (playlists.length <= 1) return;
        setPlaylists(prev => prev.filter(p => p.id !== activePlaylistId));
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
            type
        };

        setPlaylists(prev => prev.map(p => {
            if (p.id === activePlaylist.id) {
                return { ...p, tracks: [...p.tracks, newTrack] };
            }
            return p;
        }));
        
        setNewTrackUrl('');
        setNewTrackTitle('');
        setShowAddTrack(false);
    };

    const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPlaylists(prev => prev.map(p => {
            if (p.id === activePlaylist.id) {
                return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
            }
            return p;
        }));
        const deletedIndex = activePlaylist.tracks.findIndex(t => t.id === trackId);
        if (deletedIndex === currentTrackIndex) {
            setPlaying(false);
        } else if (deletedIndex < currentTrackIndex) {
            setCurrentTrackIndex(prev => prev - 1);
        }
    };

    // ── Playback Controls ────────────────────────────────────────
    const handlePlayPause = () => setPlaying(!playing);
    
    const handleNext = useCallback(() => {
        if (activePlaylist.tracks.length === 0) return;
        if (currentTrackIndex < activePlaylist.tracks.length - 1) {
            setCurrentTrackIndex(prev => prev + 1);
        } else if (loop) {
            setCurrentTrackIndex(0);
        } else {
            setPlaying(false);
        }
    }, [activePlaylist, currentTrackIndex, loop]);

    const handlePrev = () => {
        if (activePlaylist.tracks.length === 0) return;
        if (currentTrackIndex > 0) {
            setCurrentTrackIndex(prev => prev - 1);
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
        } catch (e) {
            // Invalid URL
        }
        return url;
    };

    return (
        <>
            {/* Hidden ReactPlayer for audio streams */}
            {currentTrack && !isSpotify && (
                <ReactPlayer
                    src={currentTrack.url}
                    playing={playing}
                    volume={volume}
                    muted={muted}
                    loop={false}
                    onEnded={handleTrackEnded}
                    width="0"
                    height="0"
                    style={{ display: 'none' }}
                />
            )}

            {/* Overlay */}
            <div
                className={`music-overlay ${isOpen ? 'music-overlay--visible' : ''}`}
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div className={`music-drawer ${isOpen ? 'music-drawer--open' : ''}`}>
                
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
                    <span className="music-section-label">
                        Playlists · {playlists.length}
                    </span>
                    <button
                        className={`music-playlist-action-btn music-playlist-action-btn--accent ${showCreatePlaylist ? 'music-playlist-action-btn--toggled' : ''}`}
                        onClick={() => setShowCreatePlaylist(prev => !prev)}
                        title="Create playlist"
                        aria-label="Create new playlist"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* ─── Collapsible Create Playlist ────────────────── */}
                <div className={`music-create-playlist ${showCreatePlaylist ? 'music-create-playlist--open' : ''}`}>
                    <div className="music-create-playlist-inner">
                        <input
                            ref={createInputRef}
                            type="text"
                            placeholder="Playlist name"
                            value={newPlaylistName}
                            onChange={e => setNewPlaylistName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddPlaylist()}
                        />
                        <button 
                            className="music-create-btn" 
                            onClick={handleAddPlaylist} 
                            disabled={!newPlaylistName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </div>

                {/* ─── Playlist Bar ───────────────────────────────── */}
                <div className="music-playlist-bar">
                    <CustomSelect
                        value={activePlaylistId}
                        options={playlistOptions}
                        onChange={val => {
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

                {/* ─── Now Playing (compact row) ──────────────────── */}
                {currentTrack && (
                    <div className="music-now-playing">
                        <EqBars paused={!playing} small />
                        <span className="music-now-playing-title">{currentTrack.title}</span>
                        <SourceIcon type={currentTrack.type} />
                    </div>
                )}

                {/* ─── Track List Header + Add button ────────────── */}
                <div className="music-section-header">
                    <span className="music-section-label">
                        Tracks · {activePlaylist.tracks.length}
                    </span>
                    <button
                        className={`music-playlist-action-btn music-playlist-action-btn--accent ${showAddTrack ? 'music-playlist-action-btn--toggled' : ''}`}
                        onClick={() => setShowAddTrack(prev => !prev)}
                        title="Add track"
                        aria-label="Add new track"
                    >
                        <Plus size={14} />
                    </button>
                </div>

                {/* ─── Collapsible Add Track ───────────────────────── */}
                <div className={`music-add-track-collapse ${showAddTrack ? 'music-add-track-collapse--open' : ''}`}>
                    <div className="music-add-track-inner">
                        <input
                            type="text"
                            placeholder="Track name (optional)"
                            value={newTrackTitle}
                            onChange={e => setNewTrackTitle(e.target.value)}
                        />
                        <div className="music-add-track-url-row">
                            <input
                                ref={addTrackUrlRef}
                                type="text"
                                placeholder="YouTube or Spotify URL"
                                value={newTrackUrl}
                                onChange={e => setNewTrackUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTrack()}
                            />
                            <button 
                                className="music-create-btn" 
                                onClick={handleAddTrack} 
                                disabled={!newTrackUrl.trim()}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

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
                                        {isActive && playing ? (
                                            <EqBars small />
                                        ) : (
                                            idx + 1
                                        )}
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
                                <button className="music-dock-btn" onClick={() => setMuted(!muted)} aria-label="Toggle mute">
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
                                        style={{ '--volume-fill': `${(muted ? 0 : volume) * 100}%` } as React.CSSProperties}
                                    />
                                </div>
                            </div>

                            {/* Centered playback controls */}
                            <div className="music-dock-center">
                                <button className="music-dock-btn" onClick={handlePrev} disabled={!currentTrack}>
                                    <SkipBack size={18} />
                                </button>
                                <button className="music-dock-play" onClick={handlePlayPause} disabled={!currentTrack}>
                                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
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
            </div>

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
                </button>
            )}
        </>
    );
}

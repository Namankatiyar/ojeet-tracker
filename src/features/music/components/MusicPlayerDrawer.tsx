import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    ListMusic
} from 'lucide-react';
import { useLocalStorage } from '../../../shared/hooks/useLocalStorage';

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

// ── Helper ────────────────────────────────────────────────────────
function determineTrackType(url: string): 'youtube' | 'spotify' | 'other' {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('spotify.com')) return 'spotify';
    return 'other';
}

// ── Component ─────────────────────────────────────────────────────
export function MusicPlayerDrawer() {
    const [isOpen, setIsOpen] = useState(false);
    
    // Playlists state via localStorage
    const [playlists, setPlaylists] = useLocalStorage<Playlist[]>('ojee_playlists', [DEFAULT_PLAYLIST]);
    const [activePlaylistId, setActivePlaylistId] = useLocalStorage<string>('ojee_active_playlist', DEFAULT_PLAYLIST.id);
    
    // UI State for new playlist & track
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [newTrackUrl, setNewTrackUrl] = useState('');
    const [newTrackTitle, setNewTrackTitle] = useState('');

    // Player state
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [muted, setMuted] = useState(false);
    const [loop, setLoop] = useState(false);

    // Derived State
    const activePlaylist = useMemo(() => {
        return playlists.find(p => p.id === activePlaylistId) || playlists[0] || DEFAULT_PLAYLIST;
    }, [playlists, activePlaylistId]);

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
    };

    const handleDeletePlaylist = () => {
        if (playlists.length <= 1) return; // Prevent deleting last playlist
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
    };

    const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPlaylists(prev => prev.map(p => {
            if (p.id === activePlaylist.id) {
                return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
            }
            return p;
        }));
        // Adjust index if necessary
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
        // convert https://open.spotify.com/track/xyz to https://open.spotify.com/embed/track/xyz
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
        return url; // fallback
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
                    loop={false} // We handle loop via onEnded
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
                
                {/* Header */}
                <div className="music-header">
                    <div className="music-header-title">
                        <Music size={16} style={{ color: 'var(--accent)' }}/>
                        Music Player
                    </div>
                    <div className="music-header-actions">
                        <button className="music-icon-btn" onClick={handleClose} aria-label="Close">
                            <X size={14} />
                        </button>
                    </div>
                </div>

                {/* Playlist Manager */}
                <div className="music-playlist-manager">
                    <div className="music-playlist-select-wrapper">
                        <ListMusic size={16} style={{ color: 'var(--text-muted)' }} />
                        <select 
                            className="music-playlist-select"
                            value={activePlaylistId}
                            onChange={e => {
                                setActivePlaylistId(e.target.value);
                                setCurrentTrackIndex(0);
                                setPlaying(false);
                            }}
                        >
                            {playlists.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button 
                            className="music-icon-btn" 
                            style={{ borderRadius: 'var(--radius-sm)' }}
                            onClick={handleDeletePlaylist}
                            disabled={playlists.length <= 1}
                            title="Delete current playlist"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <div className="music-new-playlist">
                        <input 
                            type="text"
                            placeholder="New Playlist Name"
                            value={newPlaylistName}
                            onChange={e => setNewPlaylistName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddPlaylist()}
                        />
                        <button className="music-add-btn" onClick={handleAddPlaylist} disabled={!newPlaylistName.trim()}>
                            <Plus size={14} />
                        </button>
                    </div>
                </div>

                {/* Track List */}
                <div className="music-track-list">
                    {activePlaylist.tracks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                            No tracks in this playlist.
                        </div>
                    ) : (
                        activePlaylist.tracks.map((track, idx) => (
                            <div 
                                key={track.id} 
                                className={`music-track-item ${idx === currentTrackIndex ? 'music-track-item--active' : ''}`}
                                onClick={() => {
                                    setCurrentTrackIndex(idx);
                                    setPlaying(true);
                                }}
                            >
                                <div className="music-track-info">
                                    <div className="music-track-title">{track.title}</div>
                                    <div className="music-track-url">{track.type === 'spotify' ? 'Spotify' : 'Audio Stream'}</div>
                                </div>
                                <div className="music-track-actions">
                                    <button 
                                        className="music-track-btn"
                                        onClick={(e) => handleDeleteTrack(track.id, e)}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Track Area */}
                <div className="music-add-track-area">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        <div className="music-input-wrapper">
                            <input 
                                type="text"
                                className="music-input"
                                placeholder="Track Name (Optional)"
                                value={newTrackTitle}
                                onChange={e => setNewTrackTitle(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <div className="music-input-wrapper" style={{ flex: 1 }}>
                                <input 
                                    type="text"
                                    className="music-input"
                                    placeholder="YouTube or Spotify URL"
                                    value={newTrackUrl}
                                    onChange={e => setNewTrackUrl(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddTrack()}
                                />
                            </div>
                            <button className="music-send-btn" onClick={handleAddTrack} disabled={!newTrackUrl.trim()}>
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Spotify Embedded Player Area */}
                {currentTrack && isSpotify && (
                    <div style={{ padding: 'var(--space-3)', background: 'var(--bg-primary)' }}>
                        <iframe 
                            src={getSpotifyEmbedUrl(currentTrack.url)} 
                            width="100%" 
                            height="152" 
                            frameBorder="0" 
                            allowFullScreen 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                            style={{ borderRadius: 'var(--radius-md)', background: 'transparent' }}
                        ></iframe>
                        <div className="music-player-primary-actions" style={{ marginTop: 'var(--space-3)' }}>
                            <button className="music-control-btn" onClick={handlePrev}><SkipBack size={18} /></button>
                            <button className={`music-control-btn ${loop ? 'music-control-btn--active' : ''}`} onClick={() => setLoop(!loop)}><Repeat size={16} /></button>
                            <button className="music-control-btn" onClick={handleNext}><SkipForward size={18} /></button>
                        </div>
                    </div>
                )}

                {/* Custom Player Controls (YouTube/etc) */}
                {(!isSpotify || !currentTrack) && (
                    <div className="music-player-controls">
                        <div className="music-player-primary-actions">
                            <button className="music-control-btn" onClick={handlePrev} disabled={!currentTrack}>
                                <SkipBack size={18} />
                            </button>
                            <button className="music-control-btn music-control-btn--play" onClick={handlePlayPause} disabled={!currentTrack}>
                                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                            </button>
                            <button className="music-control-btn" onClick={handleNext} disabled={!currentTrack}>
                                <SkipForward size={18} />
                            </button>
                            <button className={`music-control-btn ${loop ? 'music-control-btn--active' : ''}`} onClick={() => setLoop(!loop)}>
                                <Repeat size={16} />
                            </button>
                        </div>
                        <div className="music-player-secondary-actions">
                            <button className="music-control-btn" style={{ padding: 0 }} onClick={() => setMuted(!muted)}>
                                {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                            </button>
                            <input 
                                type="range" 
                                min={0} 
                                max={1} 
                                step="any"
                                value={muted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="music-volume-slider"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* FAB Toggle */}
            {!isOpen && (
                <button
                    className="music-fab"
                    onClick={toggleOpen}
                    aria-label="Open Music Player"
                    title="Music Player"
                >
                    <span className="music-fab-icon">
                        <img src="/musicBot.png" alt="Music" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-full)' }} />
                    </span>
                </button>
            )}
        </>
    );
}

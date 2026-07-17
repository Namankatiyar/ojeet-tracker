import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';

export interface ClockBgSettings {
  mode: 'global' | 'url' | 'local';
  customUrl: string;
  blur: number;
  dim: number;
}

interface BgSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ClockBgSettings;
  localImage: string;
  onSave: (settings: ClockBgSettings, localImage: string) => void;
  globalBackgroundUrl: string;
}

export function BgSettingsModal({
  isOpen,
  onClose,
  settings,
  localImage,
  onSave,
  globalBackgroundUrl,
}: BgSettingsModalProps) {
  const [mode, setMode] = useState<'global' | 'url' | 'local'>(settings.mode);
  const [customUrl, setCustomUrl] = useState(settings.customUrl);
  const [tempLocalImage, setTempLocalImage] = useState(localImage);
  const [blur, setBlur] = useState(settings.blur);
  const [dim, setDim] = useState(settings.dim);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(settings.mode);
      setCustomUrl(settings.customUrl);
      setTempLocalImage(localImage);
      setBlur(settings.blur);
      setDim(settings.dim);
    }
  }, [isOpen, settings, localImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        // Compress large images to fit in localStorage (max 1200px to keep it compact and performant)
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedUrl = canvas.toDataURL('image/jpeg', 0.6);
          setTempLocalImage(compressedUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClearLocalImage = () => {
    setTempLocalImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    onSave(
      {
        mode,
        customUrl,
        blur,
        dim,
      },
      tempLocalImage
    );
    onClose();
  };

  // Determine what background to show in the live preview
  const getPreviewBgUrl = () => {
    if (mode === 'global') return globalBackgroundUrl;
    if (mode === 'local') return tempLocalImage;
    return customUrl;
  };

  const previewBgUrl = getPreviewBgUrl();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop motion-animated"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="modal-container bg-settings-modal motion-animated"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
            <div className="modal-header">
              <h3>Customize fullscreen background</h3>
              <button className="close-btn" onClick={onClose} title="Close" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="bg-settings-modal-body">
                {/* Left side: Live Mock Preview */}
                <div className="bg-preview-section">
                  <h4 className="bg-section-heading">Live preview</h4>
                  <div className="bg-preview-box">
                    {previewBgUrl ? (
                      <div
                        className="bg-preview-image-layer"
                        style={{
                          backgroundImage: `url(${previewBgUrl})`,
                          filter: `blur(${blur}px)`,
                        }}
                      />
                    ) : (
                      <div
                        className="bg-preview-image-layer"
                        style={{
                          background: 'var(--color-bg-base)',
                        }}
                      />
                    )}
                    <div
                      className="bg-preview-dim-layer"
                      style={{
                        backgroundColor: `rgba(0, 0, 0, ${dim / 100})`,
                      }}
                    />
                    <div className="bg-preview-clock-content">
                      <span className="bg-preview-time">25:00</span>
                      <span className="bg-preview-title">Focusing on your goals</span>
                      <span className="bg-preview-label">Work</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Customization Controls */}
                <div className="bg-controls-section">
                  <h4 className="bg-section-heading">Settings</h4>
                  <div className="bg-control-group">
                    <label className="control-label">Wallpaper source</label>
                    <div className="bg-source-toggle">
                      <button
                        type="button"
                        className={`source-btn ${mode === 'global' ? 'active' : ''}`}
                        onClick={() => setMode('global')}
                      >
                        Global
                      </button>
                      <button
                        type="button"
                        className={`source-btn ${mode === 'url' ? 'active' : ''}`}
                        onClick={() => setMode('url')}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        className={`source-btn ${mode === 'local' ? 'active' : ''}`}
                        onClick={() => setMode('local')}
                      >
                        Local
                      </button>
                    </div>
                  </div>

                  {mode === 'url' && (
                    <div className="bg-control-group">
                      <label className="control-label">Background image URL</label>
                      <input
                        type="text"
                        placeholder="Paste image URL (https://...)"
                        value={customUrl}
                        onChange={(e) => setCustomUrl(e.target.value)}
                        className="custom-url-input"
                      />
                    </div>
                  )}

                  {mode === 'local' && (
                    <div className="bg-control-group">
                      <label className="control-label">Upload local image</label>
                      <div className="file-upload-container">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          style={{ display: 'none' }}
                        />
                        <button
                          type="button"
                          className="secondary-btn small-upload-btn"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload size={14} />
                          {tempLocalImage ? 'Change image' : 'Choose image'}
                        </button>
                        {tempLocalImage && (
                          <button
                            type="button"
                            className="secondary-btn small-upload-btn danger"
                            onClick={handleClearLocalImage}
                          >
                            <Trash2 size={14} />
                            Clear
                          </button>
                        )}
                      </div>
                      {tempLocalImage && (
                        <div className="duration-preview-text">
                          <ImageIcon size={12} />
                          Image loaded locally
                        </div>
                      )}
                    </div>
                  )}

                  <div className="bg-control-group">
                    <div className="slider-label-row">
                      <label className="control-label">Blur amount</label>
                      <span className="slider-value">{blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={blur}
                      onChange={(e) => setBlur(parseInt(e.target.value, 10))}
                      className="settings-slider"
                      style={{ '--slider-fill': `${(blur / 30) * 100}%` } as React.CSSProperties}
                    />
                  </div>

                  <div className="bg-control-group">
                    <div className="slider-label-row">
                      <label className="control-label">Dimming overlay</label>
                      <span className="slider-value">{dim}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={dim}
                      onChange={(e) => setDim(parseInt(e.target.value, 10))}
                      className="settings-slider"
                      style={{ '--slider-fill': `${(dim / 90) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={onClose}>
                Cancel
              </button>
              <button className="modal-btn primary" onClick={handleSave}>
                Save changes
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

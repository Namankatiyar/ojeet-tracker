import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';
import React from 'react';

const h = React.createElement;

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const code = url.searchParams.get('code');

    if (!code) {
      return res.status(400).send('Missing invite code');
    }

    const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/^"|"$/g, '');
    const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').replace(/^"|"$/g, '');

    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).send('Supabase URL or Anon Key is missing in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let data, error;
    try {
      const res = await supabase.rpc('get_profile_by_invite_code', { friend_code: code });
      data = res.data;
      error = res.error;
    } catch (err) {
      console.error('Supabase RPC fetch failed:', err);
      return res.status(500).send(`Supabase RPC error: ${err.message}`);
    }

    if (error || !data || data.length === 0) {
      return res.status(404).send('User not found');
    }

    const profile = data[0];
    const { display_name, avatar_url, banner_url } = profile;

    const isValidHttpUrl = (str) => {
      if (!str) return false;
      return str.startsWith('http://') || str.startsWith('https://');
    };

    const validAvatarUrl = isValidHttpUrl(avatar_url) ? avatar_url : null;
    const validBannerUrl = isValidHttpUrl(banner_url) ? banner_url : null;

    // --- Name initials for fallback avatar ---
    const initials = (display_name || '?')
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

    // --- Avatar element ---
    const avatarSize = 260; // Increased size for better visibility
    const avatarRingSize = avatarSize + 16;
    const avatarElement = h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: `${avatarRingSize}px`,
          height: `${avatarRingSize}px`,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6)', // High contrast ring
          padding: '8px',
          flexShrink: 0,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        },
      },
      validAvatarUrl
        ? h('img', {
            src: avatar_url,
            width: avatarSize,
            height: avatarSize,
            style: {
              width: `${avatarSize}px`,
              height: `${avatarSize}px`,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '6px solid #0f172a',
            },
          })
        : h(
            'div',
            {
              style: {
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '6px solid #0f172a',
                fontSize: '96px', // Much larger initials
                fontWeight: 800,
                color: '#e0e7ff',
                fontFamily: 'sans-serif',
              },
            },
            initials
          )
    );

    // --- Trend Up SVG icon ---
    const trendIcon = h(
      'svg',
      {
        width: '32',
        height: '32',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: '#f59e0b', // High contrast amber
        strokeWidth: '3',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      h('polyline', { points: '22 7 13.5 15.5 8.5 10.5 2 17' }),
      h('polyline', { points: '16 7 22 7 22 13' })
    );

    // --- Build the full image element ---
    const element = h(
      'div',
      {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          fontFamily: 'Inter, sans-serif',
        },
      },

      // ─── Background Layer: Banner or solid gradient ───
      validBannerUrl
        ? h('img', {
            src: banner_url,
            width: 1200,
            height: 630,
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          })
        : h('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)', // High contrast dark slate
            },
          }),

      // ─── Dark gradient overlay for text legibility (darker for high contrast) ───
      validBannerUrl
        ? h('div', {
            style: {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.7) 100%)', // Thicker, darker overlay
            },
          })
        : null,

      // ─── Ambient glow orbs ───
      h('div', {
        style: {
          position: 'absolute',
          top: '-150px',
          right: '-100px',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, transparent 60%)', // Brighter amber glow
        },
      }),
      h('div', {
        style: {
          position: 'absolute',
          bottom: '-200px',
          left: '-150px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%)', // Brighter violet glow
        },
      }),

      // ─── Subtle dot pattern overlay ───
      h('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0.25,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        },
      }),

      // ─── Main content container ───
      h(
        'div',
        {
          style: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '64px', // Tighter padding, elements take up more space
          },
        },

        // ── Top bar: branding ──
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              },
            },
            trendIcon,
            h(
              'span',
              {
                style: {
                  fontSize: '32px', // Larger branding
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontFamily: 'sans-serif',
                },
              },
              'OJEE Tracker'
            )
          ),
          // Domain pill
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '8px 24px',
                borderRadius: '9999px',
                border: '2px solid rgba(255,255,255,0.2)',
                backgroundColor: 'rgba(255,255,255,0.1)', // More contrast
              },
            },
            h(
              'span',
              {
                style: {
                  fontSize: '20px', // Larger domain
                  fontWeight: 600,
                  color: '#f8fafc',
                  fontFamily: 'sans-serif',
                },
              },
              'tracker.ojeet.tech'
            )
          )
        ),

        // ── Center: avatar + name + tagline (Row layout for better space utilization) ──
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '48px', // Proper spacing between avatar and text
              margin: 'auto 0', // Center vertically
            },
          },
          avatarElement,
          h(
            'div',
            {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                flex: 1, // Take remaining space
              },
            },
            h(
              'span',
              {
                style: {
                  fontSize: '84px', // Massive name for visibility
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1.1,
                  letterSpacing: '-0.04em',
                  fontFamily: 'sans-serif',
                  textShadow: '0 4px 24px rgba(0,0,0,0.5)', // Sharp drop shadow
                  maxWidth: '700px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              display_name || 'Student'
            ),
            h(
              'span',
              {
                style: {
                  fontSize: '36px', // Larger tagline
                  fontWeight: 500,
                  color: '#f59e0b', // High contrast amber instead of muted gray
                  letterSpacing: '0.01em',
                  fontFamily: 'sans-serif',
                },
              },
              'Invites you to study together'
            )
          )
        ),

        // ── Bottom bar: CTA + invite code ──
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            },
          },
          // Solid CTA badge for max contrast
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px 32px',
                borderRadius: '16px',
                background: '#f59e0b', // Solid amber
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)', // Glowing shadow
              },
            },
            // Link icon
            h(
              'svg',
              {
                width: '28',
                height: '28',
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: '#000000', // Dark icon
                strokeWidth: '2.5',
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              },
              h('path', {
                d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
              }),
              h('path', {
                d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
              })
            ),
            h(
              'span',
              {
                style: {
                  fontSize: '24px', // Bigger CTA text
                  fontWeight: 700,
                  color: '#000000', // Dark text on amber
                  fontFamily: 'sans-serif',
                },
              },
              'Click to connect'
            )
          ),
          // Invite code badge
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 28px',
                borderRadius: '12px',
                backgroundColor: 'rgba(0,0,0,0.6)', // Dark background
                border: '2px solid rgba(255,255,255,0.2)', // Light border
              },
            },
            h(
              'span',
              {
                style: {
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontFamily: 'sans-serif',
                },
              },
              'CODE'
            ),
            h(
              'span',
              {
                style: {
                  fontSize: '28px', // Larger code
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '0.12em',
                  fontFamily: 'monospace',
                },
              },
              code.toUpperCase()
            )
          )
        )
      )
    );

    const imageRes = new ImageResponse(element, {
      width: 1200,
      height: 630,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
    );

    const buffer = await imageRes.arrayBuffer();
    return res.status(200).end(Buffer.from(buffer));
  } catch (e) {
    console.error('Error in invite-image node function:', e);
    if (e.cause) {
      console.error('Error cause details:', e.cause);
    }
    return res.status(500).send(`Failed to generate image: ${e.message}`);
  }
}

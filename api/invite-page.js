import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Helper function to replace metadata
function replaceMeta(html, property, name, value) {
  const attr = property ? 'property' : 'name';
  const val = property || name;
  const regex = new RegExp(`<meta\\s+[^>]*?${attr}="${val}"[^>]*?>`, 'i');
  const newTag = `<meta ${attr}="${val}" content="${value}" />`;

  if (html.match(regex)) {
    return html.replace(regex, newTag);
  } else {
    return html.replace('</head>', `${newTag}\n</head>`);
  }
}

export default async function handler(req, res) {
  const inviteCode = req.query.inviteCode || req.query.code;

  if (!inviteCode) {
    return res.status(400).send('Missing invite code');
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the profile details via RPC (which has SECURITY DEFINER and can bypass RLS)
    const { data, error } = await supabase.rpc('get_profile_by_invite_code', {
      friend_code: inviteCode,
    });

    let displayName = 'a Study Peer';
    if (!error && data && data.length > 0) {
      displayName = data[0].display_name;
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'tracker.ojeet.tech';
    const isDev =
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      process.env.NODE_ENV === 'development' ||
      process.env.VERCEL_ENV === 'development';

    // Read the static index.html template
    let htmlPath;
    if (isDev) {
      htmlPath = path.join(process.cwd(), 'index.html');
    } else {
      htmlPath = path.join(process.cwd(), 'dist', 'index.html');
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.join(process.cwd(), 'index.html');
      }
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    if (isDev) {
      const preamble = `
        <script type="module" src="/@vite/client"></script>
        <script type="module">
          import { injectIntoGlobalHook } from "/@react-refresh"
          injectIntoGlobalHook(window)
          window.$RefreshReg$ = () => {}
          window.$RefreshSig$ = () => (type) => type
          window.__vite_plugin_react_preamble_installed__ = true
        </script>
      `;
      html = html.replace('<head>', `<head>${preamble}`);
    }

    const ogTitle = `Connect with ${displayName} | OJEE Tracker`;
    const ogDescription = `Join their study workspace to track JEE syllabus progress, plan daily tasks, and study together.`;
    const ogImageUrl = `https://${host}/api/invite-image?code=${inviteCode}`;

    // Inject custom meta tags
    html = replaceMeta(html, 'og:title', null, ogTitle);
    html = replaceMeta(html, null, 'twitter:title', ogTitle);
    html = replaceMeta(html, 'og:description', null, ogDescription);
    html = replaceMeta(html, null, 'twitter:description', ogDescription);
    html = replaceMeta(html, 'og:image', null, ogImageUrl);
    html = replaceMeta(html, null, 'twitter:image', ogImageUrl);

    // Also inject page title and description
    html = html.replace(/<title>.*?<\/title>/i, `<title>${ogTitle}</title>`);
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${ogDescription}" />`
    );

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error rendering invite page:', error);
    // On error, fall back to returning raw index.html (which will boot the react app anyway)
    try {
      let htmlPath = path.join(process.cwd(), 'dist', 'index.html');
      if (!fs.existsSync(htmlPath)) {
        htmlPath = path.join(process.cwd(), 'index.html');
      }
      const html = fs.readFileSync(htmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (e) {
      return res.status(500).send('Internal Server Error');
    }
  }
}

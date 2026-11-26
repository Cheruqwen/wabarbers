// =====================================================================
//  PitStop 87 · settings for your website
//  Fill these in from Supabase → Project Settings → API (see README).
//  Leave supabaseUrl empty to run in DEMO MODE (data stays on each device).
// =====================================================================
window.PITSTOP_CONFIG = {
  // "Project URL", e.g. https://abcdxyzcompany.supabase.co
  supabaseUrl: '',

  // "anon public" key. It's safe to publish: the database checks every action.
  supabaseAnonKey: '',

  // Staff sign in with phone + PIN. Behind the scenes this becomes a login name
  // like p254712345678@staff.yourdomain.co.ke. Use your own domain here, and
  // don't change it after staff have joined. No emails are ever sent to it.
  loginDomain: 'staff.pitstop-app.com',

  // Optional: your public web address, used in links sent to customers.
  // Leave empty to use whatever address the site is opened from.
  siteUrl: ''
};

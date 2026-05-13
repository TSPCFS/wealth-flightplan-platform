/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // attooh! brand tokens, extracted from attooh.co.za and mirrored in
      // MOCKUP.html. Treat these as the single source of truth: components
      // should reference them by name, not hardcode hex values.
      colors: {
        'attooh-lime': '#9CD31E',
        'attooh-lime-hover': '#7AB016',
        'attooh-lime-pale': '#F0F7DE',
        'attooh-charcoal': '#414042',
        'attooh-slate': '#505E6B',
        'attooh-muted': '#58595B',
        'attooh-bg': '#FAFAF7',
        'attooh-card': '#FFFFFF',
        'attooh-border': '#E8E8E4',
        'attooh-success': '#4F9C2C',
        'attooh-warn': '#E8A93A',
        'attooh-danger': '#C7363B',
      },
      fontFamily: {
        // Primary: Montserrat for body + headings.
        // Accent:  Lato for uppercase UI labels (eyebrows, pills, captions).
        sans: ['Montserrat', 'system-ui', '-apple-system', 'sans-serif'],
        montserrat: ['Montserrat', 'system-ui', 'sans-serif'],
        lato: ['Lato', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'attooh-sm': '0 1px 2px rgba(65,64,66,0.04), 0 1px 3px rgba(65,64,66,0.06)',
        'attooh-md': '0 4px 8px rgba(65,64,66,0.06), 0 1px 3px rgba(65,64,66,0.04)',
      },
    },
  },
  plugins: [],
}

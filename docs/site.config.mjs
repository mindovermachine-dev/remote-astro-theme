// Steering config: this CLI documents itself using mom-doc-theme.
export default {
  theme: "mindovermachine-dev/mom-doc-theme@main",
  title: "remote-astro-theme",
  site: "https://docs.mindovermachine.dev",
  rootRedirect: null,
  defaultLocale: "root",
  locales: { root: { label: "English", lang: "en" } },
  astro: { base: "/remote-astro-theme", server: { host: true } },
  social: [
    {
      icon: "github",
      label: "GitHub",
      href: "https://github.com/mindovermachine-dev/remote-astro-theme",
    },
  ],
  sidebar: [
    { 
      label: "Guide", 
      items: [{ autogenerate: { directory: "guide" } }] },
    {
      label: "Development",
      items: [{ autogenerate: { directory: "development" } }],
    },
  ],
};

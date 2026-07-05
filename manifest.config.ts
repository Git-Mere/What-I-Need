import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "__MSG_extension_name__",
  description: "__MSG_extension_description__",
  default_locale: "en",
  version: "0.0.1",
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle"
    }
  ],
  permissions: ["storage"]
});

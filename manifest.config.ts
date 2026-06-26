import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "What I Need",
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

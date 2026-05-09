# Snap & Sell

A mobile-first marketplace listing demo:

1. Snap or upload a product photo.
2. Add item details and review price guidance, similar listings, and market feedback.
3. Review the generated listing and press a demo-only upload button.

The app is set up as a Progressive Web App, so it can be installed to a phone home screen after it is hosted on HTTPS.

## Run Locally

Open `index.html` in a browser, or serve the folder with a static server.

```bash
python -m http.server 4181
```

Then visit:

```text
http://127.0.0.1:4181
```

## Make It Public

For a simple public demo, deploy the folder to Netlify or Vercel. Because it includes `manifest.json` and `service-worker.js`, supported mobile browsers can install it as an app.

For real AI use, host the OpenRouter call behind a serverless function and store the API key as a platform environment variable. Do not put a real API key in frontend JavaScript for a public site.

## OpenRouter Demo Config

The UI does not show API settings. For a demo with a real OpenRouter model, edit `script.js`:

```js
const OPENROUTER_CONFIG = {
  enabled: true,
  apiKey: "your-openrouter-key",
  model: "openai/gpt-4o-mini",
};
```

For a public app, move the API call to a backend so the key is not exposed in frontend code.

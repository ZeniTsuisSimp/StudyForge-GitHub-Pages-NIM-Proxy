# StudyForge — GitHub Pages + NVIDIA NIM Proxy

This deployment keeps the **StudyForge frontend on GitHub Pages** and uses a tiny **Netlify Function** only as a CORS proxy to NVIDIA NIM.

## Architecture

GitHub Pages → Netlify Function → NVIDIA NIM

The visitor enters their own NVIDIA NIM API key in the StudyForge popup. The key is sent to the function only with the current request and is forwarded to NVIDIA. The function does not store the key.

NVIDIA's hosted LLM API uses:

`POST https://integrate.api.nvidia.com/v1/chat/completions`

The model is configured internally by StudyForge; users are never asked to select a model.

## Files

### GitHub Pages
- `index.html`
- `styles.css`
- `app.js`
- `config.js`

### Netlify proxy
- `netlify/functions/nim.mjs`
- `netlify.toml`

## Deploy the proxy FIRST

1. Create a new GitHub repository for the project, or use the same repository.
2. Deploy the repository to Netlify.
3. Netlify detects `netlify/functions/nim.mjs` using `netlify.toml`.
4. After deployment, your function URL will look like:

`https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/nim`

5. Edit `config.js`:

```js
window.STUDYFORGE_CONFIG = {
  NIM_PROXY_URL: "https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/nim"
};
```

6. Push the change to GitHub.

## GitHub Pages

Publish the repository with GitHub Pages from the branch/folder containing the frontend.

The public site can remain:

`https://YOUR-USERNAME.github.io/YOUR-REPO/`

## Important

Do NOT put your own `nvapi-...` key in `config.js`, `app.js`, Netlify code, or GitHub.

`config.js` contains only the public URL of the proxy.

Users provide their own NIM key when they use a tool.

## Why the proxy is necessary

GitHub Pages is static hosting. NVIDIA's hosted endpoint is not suitable for direct browser requests in this setup because the browser request can be blocked by cross-origin policy. The Netlify Function performs the server-side request to NVIDIA and returns the response to the GitHub Pages frontend.

## Netlify deployment

Netlify Functions are deployed with the site and can be connected to a Git repository for continuous deployment.

No always-running server is required.

## Tools

1. AI Resume Builder
2. AI Notes Generator
3. AI Presentation Generator + PPTX
4. Syllabus Mind Map
5. Google Sheets + AI Insights
6. AI Quiz / MCQs
7. Subject Doubt Solver
8. AI Flashcards
9. AI Study Planner
10. Photo Notes OCR + AI Summary

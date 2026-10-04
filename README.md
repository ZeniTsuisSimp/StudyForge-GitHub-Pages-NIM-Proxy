# StudyForge — GitHub Pages + Gemini + Netlify Proxy

StudyForge is a static academic AI-tools site. The browser asks for a user's Gemini API key, stores it only in the current browser session, and sends requests through the Netlify function. The Netlify function calls Gemini without exposing a server-owned key.

## AI provider

- Provider: Google Gemini API
- Model: `gemini-3.5-flash-lite` (hardcoded; users do not choose a model)
- API key: user supplied from Google AI Studio
- Frontend: GitHub Pages
- Proxy: Netlify Function

## Deploy

1. Put this folder in a GitHub repository and enable GitHub Pages.
2. Deploy the same repository to Netlify, or connect the repository to Netlify.
3. The included `netlify.toml` publishes the site and uses `netlify/functions`.
4. `config.js` already points to the current Netlify site:
   `https://moonlit-starburst-4a2173.netlify.app/.netlify/functions/nim`
5. Get a Gemini API key from Google AI Studio and paste it into StudyForge when an AI tool is opened.

## Security note

The key is not hardcoded into the site. It is kept in `sessionStorage` for the current browser session and sent to Gemini through the proxy. Do not commit an API key to GitHub.

## Important

The Netlify function is intentionally named `nim` to avoid changing the existing deployment path. It no longer calls NVIDIA; it translates the existing frontend request format to Gemini and returns a compatible response.

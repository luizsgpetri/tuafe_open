# Church community front-end

React + Vite + Bootstrap app that covers the parts of the church system that
live outside the Strapi admin panel.

| Route | Purpose |
|---|---|
| `/login` | Church member / administrator login (Strapi users-permissions) |
| `/churches` | Churches the logged in user belongs to |
| `/church/:token` | Public church profile |
| `/qr/:token` | Invitation QR code — opened by the "Get QR Code" button in the admin panel |
| `/join/:token` | Form the QR code leads to: enter an email, become a member |

## Development

```bash
npm install && npm run dev
```

The API URL defaults to the current host on port 1337; override it with
`VITE_API_URL` at build time.

## Production

```bash
npm run build && npm start
```

`server.mjs` serves `dist/` on port 3000 with the SPA fallback every client
side route needs. It uses the Node standard library only, so the runtime image
needs no front-end dependencies.

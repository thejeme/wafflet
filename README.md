# Wafflet

Simple chats and polls. Just share a link.

Wafflet is a small React app for starting a conversation or making a quick group decision, with no sign-up required.

## Features

- Real-time chat rooms with shareable links and anonymous avatars.
- Polls with live results and one vote per browser identity.
- Copy-link controls with a manual fallback when clipboard access is unavailable.
- Mobile layouts that keep the chat composer visible as the keyboard opens.
- Loading states, retry controls, and drafts preserved after failed sends.
- Locally hosted Bricolage Grotesque typography and Open Graph/Twitter previews.

## Run locally

Use Node.js 24.22.0 (pinned in [.nvmrc](.nvmrc)) and npm 11 or newer:

```sh
nvm use
npm ci
npm start
```

Open [localhost:3000](http://localhost:3000). Changes reload automatically.

### Firebase

The app connects directly to Cloud Firestore using the configuration in [src/firebase.js](src/firebase.js). The checked-in configuration points to the existing Wafflet Firebase project; no environment file is currently required.

For your own instance, replace that configuration with your Firebase project's web app configuration, enable Cloud Firestore, and configure its access rules for the app's reads and writes. Firestore rules are not included in this repository.

Chats store messages in a `c-<roomId>` collection. Polls use a `polls/<roomId>` document, with transactions for creation and voting.

## Using Wafflet

Choose **Create new chat** or **Create new poll** on the home screen, then use **Copy link** to invite others. Polls need a question and at least two options before they can be created.

Chat links use `/c/:id`; poll links use `/p/:id`. Each browser gets a generated identity stored in local storage. If storage is unavailable, that identity lasts for the current page session. Voting is tied to this identity rather than a signed-in account.

## Development

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `npm start`        | Start the development server.          |
| `npm test`         | Run tests in watch mode.               |
| `npm run test:run` | Run the test suite once.               |
| `npm run lint`     | Check JavaScript and React hooks.      |
| `npm run build`    | Lint and build production into `build/`. |
| `npm run preview`  | Preview the production build locally.  |

Regression tests in [src/Rooms.test.jsx](src/Rooms.test.jsx) cover message failures, duplicate submissions, poll validation, concurrent voting, live results, and retry behavior. They mock Firestore and do not write to the live database.

The app uses React 19, React Router 7, Firebase 13, Vite, and Vitest. Shared styles live in [src/App.css](src/App.css); room behavior lives in [src/ChatRoom.jsx](src/ChatRoom.jsx) and [src/PollRoom.jsx](src/PollRoom.jsx).

The dependency override in `package.json` keeps Firebase's Node-only gRPC dependency on a patched version until Firebase updates its pinned range.

## Deployment

Netlify reads the Node version from [.nvmrc](.nvmrc) and the build command and publish directory from [netlify.toml](netlify.toml). This overrides an older Node version saved in the Netlify UI and prevents dependency errors such as `Cannot find module 'node:path'`. After deploying these changes, retry the build with a cleared dependency cache.

Run `npm run build` and publish the `build/` directory to a static host. Configure the host to serve `index.html` for application routes so shared chat and poll links work when opened directly. [public/\_redirects](public/_redirects) includes this fallback for hosts that support that file.

When deploying to a different domain, update the canonical URL and absolute social-image URLs in [index.html](index.html). Page-specific titles and metadata are updated in the browser by [src/PageMeta.jsx](src/PageMeta.jsx); crawlers that do not run JavaScript receive the default Wafflet preview.

## Typography and assets

Bricolage Grotesque is served from [public/fonts/](public/fonts/README.md), with variable weight and optical sizing. Its SIL Open Font License is included in [public/fonts/OFL.txt](public/fonts/OFL.txt).

The waffle logo and app icons live in `public/`, alongside the 1200 × 630 social preview image, `og-image.png`.

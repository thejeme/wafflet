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

With Node.js and npm installed:

```sh
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

| Command                                    | Purpose                                |
| ------------------------------------------ | -------------------------------------- |
| `npm start`                                | Start the development server.          |
| `npm test`                                 | Run tests in watch mode.               |
| `npm test -- --watchAll=false --runInBand` | Run the test suite once.               |
| `npm run build`                            | Create a production build in `build/`. |

Regression tests in [src/Rooms.test.js](src/Rooms.test.js) cover message failures, duplicate submissions, poll validation, concurrent voting, live results, and retry behavior. They mock Firestore and do not write to the live database.

The app uses React 18, React Router, Firebase, and Create React App. Shared styles live in [src/App.css](src/App.css); room behavior lives in [src/ChatRoom.js](src/ChatRoom.js) and [src/PollRoom.js](src/PollRoom.js).

## Deployment

Run `npm run build` and publish the `build/` directory to a static host. Configure the host to serve `index.html` for application routes so shared chat and poll links work when opened directly. [public/\_redirects](public/_redirects) includes this fallback for hosts that support that file.

When deploying to a different domain, update the canonical URL and absolute social-image URLs in [public/index.html](public/index.html). Page-specific titles and metadata are updated in the browser by [src/PageMeta.js](src/PageMeta.js); crawlers that do not run JavaScript receive the default Wafflet preview.

## Typography and assets

Bricolage Grotesque is served from [public/fonts/](public/fonts/README.md), with variable weight and optical sizing. Its SIL Open Font License is included in [public/fonts/OFL.txt](public/fonts/OFL.txt).

The waffle logo and app icons live in `public/`, alongside the 1200 × 630 social preview image, `og-image.png`.

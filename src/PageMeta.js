import { useEffect } from "react";

const description =
  "Start a chat or make a poll. Share the link and get everyone together. No sign-up needed.";

export default function PageMeta({
  title = "Wafflet — simple chats & polls",
  room = false,
  missing = false,
}) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector, value) => {
      document.querySelector(selector)?.setAttribute("content", value);
    };
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[name="twitter:title"]', title);
    setMeta(
      'meta[property="og:url"]',
      window.location.origin + window.location.pathname,
    );
    setMeta(
      'meta[name="robots"]',
      room || missing ? "noindex, nofollow" : "index, follow",
    );
    const pageDescription = room
      ? "Join this Wafflet room. No sign-up needed."
      : description;
    setMeta('meta[name="description"]', pageDescription);
    setMeta('meta[property="og:description"]', pageDescription);
    setMeta('meta[name="twitter:description"]', pageDescription);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute("href", window.location.origin + window.location.pathname);
  }, [title, room, missing]);
  return null;
}

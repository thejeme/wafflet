import React from "react";
import { Link } from "react-router-dom";
import Header from "./Header";
import PageMeta from "./PageMeta";

export default function NotFound() {
  return (
    <div className="app-shell">
      <PageMeta title="Page not found · Wafflet" missing />
      <Header />
      <main className="empty-page">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>Check the link, or start something new.</p>
        <Link className="button primary-button" to="/">
          Back to home
        </Link>
      </main>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiLink } from "react-icons/fi";
import { getUid } from "./identity";
import Avatar from "./Avatar";

export default function Header({ type, id }) {
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const timer = useRef();
  const shareButton = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowLink(false);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowLink(true);
    }
  };

  const closeLink = () => {
    setShowLink(false);
    shareButton.current?.focus();
  };

  return (
    <>
      <header className="app-header">
        {id ? (
          <>
            <Link
              to="/"
              className="icon-button back-button"
              aria-label="Back to home"
              title="Back to home"
            >
              <FiArrowLeft />
            </Link>
            <div className="room-heading">
              <span>{type}</span>
              <h1>{id}</h1>
            </div>
            <button
              ref={shareButton}
              className="share-button"
              onClick={copyLink}
              aria-live="polite"
            >
              {copied ? <FiCheck /> : <FiLink />}
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </>
        ) : (
          <>
            <Link to="/" className="brand" aria-label="Wafflet home">
              <img src="/logo.png" alt="" width="32" height="32" />
              Wafflet
            </Link>
            <Avatar
              className="header-avatar"
              uid={getUid()}
              label="Your anonymous avatar"
            />
          </>
        )}
      </header>
      {showLink && (
        <div
          className="share-fallback"
          onKeyDown={(event) => {
            if (event.key === "Escape") closeLink();
          }}
        >
          <label htmlFor="room-link">Copy this link to invite someone</label>
          <div className="row">
            <input
              id="room-link"
              readOnly
              value={window.location.href}
              autoFocus
              onFocus={(event) => event.target.select()}
            />
            <button className="text-button" onClick={closeLink}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}

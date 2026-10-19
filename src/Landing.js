import React from "react";
import { Link } from "react-router-dom";
import { customAlphabet } from "nanoid";
import { FiArrowRight, FiBarChart2, FiMessageSquare } from "react-icons/fi";
import Header from "./Header";
import PageMeta from "./PageMeta";

const nanoid = customAlphabet("abcdefghkmnopqrstuvwxyz", 8);

export default function Landing() {
  return (
    <div className="app-shell">
      <PageMeta />
      <Header />
      <main className="landing">
        <div className="landing-content">
          <img
            className="landing-logo"
            src="/logo.png"
            alt=""
            width="64"
            height="64"
          />
          <h1>A place to waffle.</h1>
          <p className="intro">
            Start a conversation. Put it to a vote.
            <br />
            Just share a link and you’re in.
          </p>
          <div className="start-actions">
            <Link className="start-action" to={`/c/${nanoid()}`}>
              <FiMessageSquare className="action-icon" />
              <span>
                <strong>Create new chat</strong>
                <span>A room for your conversation.</span>
              </span>
              <FiArrowRight className="action-arrow" />
            </Link>
            <Link className="start-action" to={`/p/${nanoid()}`}>
              <FiBarChart2 className="action-icon" />
              <span>
                <strong>Create new poll</strong>
                <span>A quick way to make a decision.</span>
              </span>
              <FiArrowRight className="action-arrow" />
            </Link>
          </div>
          <p className="landing-note">No sign-up needed.</p>
        </div>
      </main>
    </div>
  );
}

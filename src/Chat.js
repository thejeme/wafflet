import React, { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import ChatRoom from "./ChatRoom";
import Header from "./Header";
import PageMeta from "./PageMeta";

export default function Chat() {
  const { id } = useParams();
  const shell = useRef();

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    // Safari's layout viewport can stay full-height when the keyboard opens.
    const resize = () => {
      if (viewport.scale === 1 && shell.current) {
        shell.current.style.height = `${viewport.height}px`;
      }
    };
    resize();
    viewport.addEventListener("resize", resize);
    return () => viewport.removeEventListener("resize", resize);
  }, []);

  return (
    <div ref={shell} className="app-shell chat-shell">
      <PageMeta title={`Chat ${id} · Wafflet`} room />
      <Header type="Chat room" id={id} />
      <ChatRoom key={id} id={id} />
    </div>
  );
}

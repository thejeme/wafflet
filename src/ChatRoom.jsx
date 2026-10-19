import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { customAlphabet } from "nanoid";
import { FiArrowDown, FiMessageSquare, FiSend } from "react-icons/fi";
import { firestore } from "./firebase";
import { getUid } from "./identity";
import Avatar from "./Avatar";

const nanoid = customAlphabet("1234567890abcdefghkmnopqrstuvwxyz", 36);

export default function ChatRoom({ id }) {
  const scrollArea = useRef();
  const nearBottom = useRef(true);
  const sending = useRef(false);
  const [formValue, setFormValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesRef = useMemo(() => collection(firestore, "c-" + id), [id]);
  const messagesQuery = useMemo(
    () => query(messagesRef, orderBy("createdAt", "desc"), limit(1000)),
    [messagesRef],
  );
  const [messages, loading, error] = useCollectionData(messagesQuery);
  const uid = getUid();

  const scrollToBottom = (behavior = "auto") => {
    const area = scrollArea.current;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    area?.scrollTo({
      top: area.scrollHeight,
      behavior: reduceMotion ? "auto" : behavior,
    });
    nearBottom.current = true;
    setHasNewMessages(false);
  };

  useEffect(() => {
    if (nearBottom.current) scrollToBottom();
    else setHasNewMessages(true);
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = formValue.trim();
    if (!text || sending.current) return;
    sending.current = true;
    setIsSending(true);
    setSendError("");
    try {
      await addDoc(messagesRef, {
        text,
        id: nanoid(),
        uid,
        createdAt: serverTimestamp(),
      });
      setFormValue("");
      scrollToBottom();
    } catch {
      setSendError(
        "Message couldn’t be sent. Your draft is still here — try again.",
      );
    } finally {
      sending.current = false;
      setIsSending(false);
    }
  };

  return (
    <>
      <main
        className="chat-messages"
        ref={scrollArea}
        aria-label="Conversation"
        onScroll={() => {
          const area = scrollArea.current;
          nearBottom.current =
            area.scrollHeight - area.scrollTop - area.clientHeight < 80;
          if (nearBottom.current) setHasNewMessages(false);
        }}
      >
        {loading && (
          <p className="state-message" role="status">
            Loading conversation…
          </p>
        )}
        {error && (
          <div className="notice error-notice" role="alert">
            Couldn’t load this conversation. Check your connection and{" "}
            <button
              className="inline-button"
              onClick={() => window.location.reload()}
            >
              try again
            </button>
            .
          </div>
        )}
        {!loading && !error && !messages?.length && (
          <div className="chat-empty">
            <FiMessageSquare aria-hidden="true" />
            <h2>No messages yet.</h2>
            <p>
              Copy the link to invite someone,
              <br />
              then say hello.
            </p>
          </div>
        )}
        <div
          className="message-list"
          role="log"
          aria-label="Messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages &&
            [...messages].reverse().map((message) => (
              <div
                key={message.id}
                className={`message ${message.uid === uid ? "sent" : "received"}`}
              >
                <Avatar
                  uid={message.uid}
                  label={message.uid === uid ? "You" : "Participant"}
                />
                <p>{message.text}</p>
              </div>
            ))}
        </div>
      </main>
      {hasNewMessages && (
        <div className="new-messages">
          <button
            className="secondary-button"
            onClick={() => scrollToBottom("smooth")}
          >
            <FiArrowDown /> New messages
          </button>
        </div>
      )}
      <div className="composer-container">
        {sendError && (
          <p className="notice error-notice" role="alert">
            {sendError}
          </p>
        )}
        <form className="composer" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-input">
            Your message
          </label>
          <input
            id="message-input"
            value={formValue}
            onChange={(event) => setFormValue(event.target.value)}
            maxLength={1000}
            placeholder="Type a message…"
            autoComplete="off"
            readOnly={isSending}
          />
          <button
            className="primary-button icon-button send-button"
            type="submit"
            disabled={!formValue.trim() || isSending || Boolean(error)}
            aria-label={isSending ? "Sending message" : "Send message"}
            title="Send message"
          >
            <FiSend />
          </button>
        </form>
      </div>
    </>
  );
}

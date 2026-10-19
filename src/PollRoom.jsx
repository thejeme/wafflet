import React, { useState, useEffect, useRef } from "react";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { customAlphabet } from "nanoid";
import { FiPlus, FiX, FiCheck } from "react-icons/fi";
import { firestore } from "./firebase";
import { getUid } from "./identity";

const nanoid = customAlphabet("1234567890abcdefghkmnopqrstuvwxyz", 36);
const makeOption = () => ({ text: "", votes: 0, id: nanoid() });

export default function PollRoom({ id }) {
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(() => [
    makeOption(),
    makeOption(),
    makeOption(),
  ]);
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const optionInputs = useRef({});
  const uid = getUid();

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    return onSnapshot(
      doc(firestore, "polls", id),
      (snapshot) => {
        setPoll(snapshot.exists() ? snapshot.data() : null);
        setLoading(false);
        setLoadError(false);
      },
      () => {
        setLoadError(true);
        setLoading(false);
      },
    );
  }, [id, retry]);

  const sendVote = async (optionId) => {
    if (submitting.current || poll.voters.includes(uid)) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const updatedPoll = await runTransaction(
        firestore,
        async (transaction) => {
          const pollRef = doc(firestore, "polls", id);
          const snapshot = await transaction.get(pollRef);
          if (!snapshot.exists()) throw new Error("Poll missing");
          const current = snapshot.data();
          if (current.voters.includes(uid)) return current;
          if (!current.options.some((option) => option.id === optionId))
            throw new Error("Option missing");
          const updated = {
            ...current,
            options: current.options.map((option) =>
              option.id === optionId
                ? { ...option, votes: option.votes + 1 }
                : option,
            ),
            voters: [...current.voters, uid],
          };
          transaction.update(pollRef, {
            options: updated.options,
            voters: updated.voters,
          });
          return updated;
        },
      );
      // A newer live snapshot can arrive before the transaction resolves.
      setPoll((current) =>
        current && current.voters.length > updatedPoll.voters.length
          ? current
          : updatedPoll,
      );
    } catch {
      setError("Your vote couldn’t be saved. Please try again.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const createPoll = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedTitle = title.trim();
    const trimmedOptions = options.map((option) => ({
      ...option,
      text: option.text.trim(),
    }));
    if (
      !trimmedTitle ||
      trimmedOptions.length < 2 ||
      trimmedOptions.some((option) => !option.text)
    ) {
      setError("Add a question and at least two filled-in options.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await runTransaction(firestore, async (transaction) => {
        const pollRef = doc(firestore, "polls", id);
        const existing = await transaction.get(pollRef);
        // Another participant may have created this shared room already.
        if (existing.exists()) return;
        transaction.set(pollRef, {
          title: trimmedTitle,
          options: trimmedOptions,
          uid,
          id,
          voters: [],
          createdAt: serverTimestamp(),
        });
      });
    } catch {
      setError(
        "Your poll couldn’t be created. Your question and options are still here — try again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const newOption = () => {
    const option = makeOption();
    setOptions((current) => [...current, option]);
    requestAnimationFrame(() => optionInputs.current[option.id]?.focus());
  };

  const deleteOption = (index) => {
    const nextFocus = options[index + 1] || options[index - 1];
    setOptions((current) => current.filter((_, i) => i !== index));
    optionInputs.current[nextFocus.id]?.focus();
  };

  const hasVoted = poll?.voters.includes(uid);

  return (
    <main className="poll-main">
      {loading && (
        <p className="state-message" role="status">
          Loading poll…
        </p>
      )}
      {loadError && (
        <div className="notice error-notice" role="alert">
          Couldn’t load this poll. Check your connection and{" "}
          <button
            className="inline-button"
            onClick={() => setRetry((value) => value + 1)}
          >
            try again
          </button>
          .
        </div>
      )}
      {!loading &&
        !loadError &&
        (poll ? (
          <div className="poll-content">
            <h1>{poll.title}</h1>
            <p className="page-description">
              {hasVoted
                ? "Results update live."
                : "Choose one option to vote."}
            </p>
            <div
              className="poll-options"
              aria-label="Poll options"
              aria-busy={busy}
            >
              {poll.options.map((option) => {
                const percent = poll.voters.length
                  ? Math.round((option.votes / poll.voters.length) * 100)
                  : 0;
                return (
                  <div className="poll-result" key={option.id}>
                    <div className="poll-result-top">
                      <span className="option-text">{option.text}</span>
                      <span className="poll-percent">{percent}%</span>
                    </div>
                    <div
                      className="poll-track"
                      role="meter"
                      aria-label={option.text}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <div style={{ width: `${percent}%` }} />
                    </div>
                    <div className="poll-result-bottom">
                      <span>
                        {option.votes} {option.votes === 1 ? "vote" : "votes"}
                      </span>
                      {!hasVoted && (
                        <button
                          className="vote-button"
                          aria-label={`Vote for ${option.text}`}
                          disabled={busy}
                          onClick={() => sendVote(option.id)}
                        >
                          Vote
                          <span className="sr-only"> for {option.text}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="poll-summary" aria-live="polite">
              <span>
                {poll.voters.length}{" "}
                {poll.voters.length === 1 ? "vote" : "votes"} in total
              </span>
              {hasVoted && (
                <span className="voted-status">
                  <FiCheck /> You’ve voted
                </span>
              )}
              {busy && <span>Saving…</span>}
            </div>
            {error && (
              <p className="notice error-notice" role="alert">
                {error}
              </p>
            )}
            <p className="poll-hint">Share the link to get everyone’s vote.</p>
          </div>
        ) : (
          <form className="poll-form" onSubmit={createPoll}>
            <h1>Create a poll</h1>
            <p className="page-description">
              Ask a question, add some options, and share the link.
            </p>
            <fieldset disabled={busy}>
              <div className="form-field">
                <label htmlFor="poll-title">Your question</label>
                <input
                  id="poll-title"
                  maxLength={1000}
                  placeholder="Where should we go for lunch?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>
              <div className="form-field">
                <div className="field-heading">
                  <span id="options-label">Options</span>
                  <span>At least two</span>
                </div>
                <div
                  className="option-inputs"
                  role="group"
                  aria-labelledby="options-label"
                >
                  {options.map((option, index) => (
                    <div className="option-row" key={option.id}>
                      <span className="option-number" aria-hidden="true">
                        {index + 1}
                      </span>
                      <label
                        className="sr-only"
                        htmlFor={`option-${option.id}`}
                      >
                        Option {index + 1}
                      </label>
                      <input
                        id={`option-${option.id}`}
                        ref={(element) => {
                          optionInputs.current[option.id] = element;
                        }}
                        maxLength={1000}
                        value={option.text}
                        onChange={(event) =>
                          setOptions((current) =>
                            current.map((item) =>
                              item.id === option.id
                                ? { ...item, text: event.target.value }
                                : item,
                            ),
                          )
                        }
                        placeholder={`Option ${index + 1}`}
                        required
                      />
                      <button
                        type="button"
                        className="icon-button remove-option"
                        disabled={options.length <= 2}
                        onClick={() => deleteOption(index)}
                        aria-label={`Remove option ${index + 1}`}
                        title={
                          options.length <= 2
                            ? "A poll needs at least two options"
                            : `Remove option ${index + 1}`
                        }
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-button add-option"
                  onClick={newOption}
                  disabled={options.length >= 20}
                >
                  <FiPlus /> Add option
                  {options.length >= 20 ? " (limit reached)" : ""}
                </button>
              </div>
              {error && (
                <p className="notice error-notice" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="primary-button create-poll-button"
              >
                {busy ? "Creating poll…" : "Create poll"}
              </button>
            </fieldset>
            <p className="form-hint">
              Once created, your poll is ready to share.
            </p>
          </form>
        ))}
    </main>
  );
}

import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { addDoc, onSnapshot, runTransaction } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import ChatRoom from "./ChatRoom";
import PollRoom from "./PollRoom";

jest.mock("nanoid", () => ({
  customAlphabet: () => {
    let id = 0;
    return () => `id-${++id}`;
  },
}));
jest.mock("./firebase", () => ({ firestore: {} }));
jest.mock("./identity", () => ({ getUid: () => "me" }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => "timestamp"),
  doc: jest.fn(() => "poll-ref"),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  runTransaction: jest.fn(),
}));
jest.mock("react-firebase-hooks/firestore", () => ({
  useCollectionData: jest.fn(),
}));

let snapshotListener;
const pollData = () => ({
  title: "Lunch?",
  options: [
    { id: "a", text: "Pizza", votes: 0 },
    { id: "b", text: "Soup", votes: 0 },
  ],
  voters: [],
});
const snapshot = (data) => ({ exists: () => Boolean(data), data: () => data });

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollTo = jest.fn();
  useCollectionData.mockReturnValue([[], false, undefined]);
  onSnapshot.mockImplementation((ref, listener) => {
    snapshotListener = listener;
    listener(snapshot(null));
    return jest.fn();
  });
});

test("whitespace messages cannot be sent", () => {
  render(<ChatRoom id="test" />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } });
  fireEvent.submit(screen.getByRole("textbox").closest("form"));
  expect(addDoc).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
});

test("failed messages preserve the draft and can be retried", async () => {
  addDoc.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({});
  const user = userEvent.setup();
  render(<ChatRoom id="test" />);
  await user.type(screen.getByRole("textbox"), "Hello there");
  await user.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "draft is still here",
  );
  expect(screen.getByRole("textbox")).toHaveValue("Hello there");
  await user.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue(""));
  expect(addDoc).toHaveBeenCalledTimes(2);
  expect(addDoc.mock.calls[1][1]).toMatchObject({
    text: "Hello there",
    uid: "me",
  });
});

test("a pending send cannot submit the same message twice", async () => {
  let finish;
  addDoc.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<ChatRoom id="test" />);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "Hello" } });
  fireEvent.submit(input.closest("form"));
  fireEvent.submit(input.closest("form"));
  expect(addDoc).toHaveBeenCalledTimes(1);
  expect(input).toHaveAttribute("readonly");
  await act(async () => finish({}));
});

test("messages from the latest query render in chronological order", () => {
  useCollectionData.mockReturnValue([
    [
      { id: "new", uid: "me", text: "Newest" },
      { id: "old", uid: "other", text: "Oldest" },
    ],
    false,
    undefined,
  ]);
  render(<ChatRoom id="test" />);
  expect(screen.getByRole("log")).toHaveTextContent("OldestNewest");
});

test("poll creation rejects whitespace and preserves valid fields on failure", async () => {
  const user = userEvent.setup();
  runTransaction.mockRejectedValue(new Error("offline"));
  render(<PollRoom id="test" />);
  await user.type(screen.getByLabelText("Your question"), "   ");
  await user.type(screen.getByLabelText("Option 1"), "Pizza");
  await user.type(screen.getByLabelText("Option 2"), "Soup");
  await user.click(screen.getByRole("button", { name: "Remove option 3" }));
  await user.click(screen.getByRole("button", { name: "Create poll" }));
  expect(screen.getByRole("alert")).toHaveTextContent(
    "at least two filled-in options",
  );
  expect(runTransaction).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText("Your question"));
  await user.type(screen.getByLabelText("Your question"), "Lunch?");
  await user.click(screen.getByRole("button", { name: "Create poll" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "couldn’t be created",
  );
  expect(screen.getByLabelText("Your question")).toHaveValue("Lunch?");
  expect(screen.getByLabelText("Option 1")).toHaveValue("Pizza");
  expect(
    screen.getByRole("button", { name: "Remove option 1" }),
  ).toBeDisabled();
});

test("creating a shared poll never overwrites an existing poll", async () => {
  const transaction = {
    get: jest.fn(async () => snapshot(pollData())),
    set: jest.fn(),
  };
  runTransaction.mockImplementation((db, callback) => callback(transaction));
  const user = userEvent.setup();
  render(<PollRoom id="test" />);
  await user.type(screen.getByLabelText("Your question"), "Another question");
  await user.type(screen.getByLabelText("Option 1"), "A");
  await user.type(screen.getByLabelText("Option 2"), "B");
  await user.click(screen.getByRole("button", { name: "Remove option 3" }));
  await user.click(screen.getByRole("button", { name: "Create poll" }));
  expect(transaction.get).toHaveBeenCalled();
  expect(transaction.set).not.toHaveBeenCalled();
});

test("transaction retries retain another participant’s vote", async () => {
  const original = pollData();
  onSnapshot.mockImplementation((ref, listener) => {
    listener(snapshot(original));
    return jest.fn();
  });
  const update = jest.fn();
  let current = original;
  runTransaction.mockImplementation(async (db, callback) => {
    const transaction = { get: async () => snapshot(current), update };
    await callback(transaction);
    // Firestore retries the callback if another voter changes the document.
    current = {
      ...original,
      options: [{ ...original.options[0], votes: 1 }, original.options[1]],
      voters: ["someone-else"],
    };
    return callback(transaction);
  });
  const user = userEvent.setup();
  render(<PollRoom id="test" />);
  await user.click(screen.getByRole("button", { name: "Vote for Soup" }));
  await waitFor(() =>
    expect(screen.getByText("You’ve voted")).toBeInTheDocument(),
  );
  expect(update.mock.calls[1][1]).toMatchObject({
    options: [
      { id: "a", votes: 1 },
      { id: "b", votes: 1 },
    ],
    voters: ["someone-else", "me"],
  });
  expect(screen.getAllByText("50%")).toHaveLength(2);
  expect(screen.getByText("2 votes in total")).toBeInTheDocument();
});

test("votes already saved in another tab cannot be counted twice", async () => {
  const original = pollData();
  onSnapshot.mockImplementation((ref, listener) => {
    listener(snapshot(original));
    return jest.fn();
  });
  const update = jest.fn();
  runTransaction.mockImplementation((db, callback) =>
    callback({
      get: async () => snapshot({ ...original, voters: ["me"] }),
      update,
    }),
  );
  render(<PollRoom id="test" />);
  fireEvent.click(screen.getByRole("button", { name: "Vote for Pizza" }));
  await waitFor(() =>
    expect(screen.getByText("You’ve voted")).toBeInTheDocument(),
  );
  expect(update).not.toHaveBeenCalled();
});

test("failed votes leave voting available for retry", async () => {
  onSnapshot.mockImplementation((ref, listener) => {
    listener(snapshot(pollData()));
    return jest.fn();
  });
  runTransaction.mockRejectedValue(new Error("offline"));
  render(<PollRoom id="test" />);
  fireEvent.click(screen.getByRole("button", { name: "Vote for Pizza" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "vote couldn’t be saved",
  );
  expect(screen.getByRole("button", { name: "Vote for Pizza" })).toBeEnabled();
});

test("poll results update when a live snapshot arrives", () => {
  render(<PollRoom id="test" />);
  act(() =>
    snapshotListener(
      snapshot({
        ...pollData(),
        voters: ["other"],
        options: [
          { id: "a", text: "Pizza", votes: 1 },
          { id: "b", text: "Soup", votes: 0 },
        ],
      }),
    ),
  );
  expect(screen.getByText("100%")).toBeInTheDocument();
  expect(screen.getByText("1 vote in total")).toBeInTheDocument();
});

test("loading errors offer a retry instead of the creation form", () => {
  onSnapshot.mockImplementation((ref, listener, error) => {
    error(new Error("unavailable"));
    return jest.fn();
  });
  render(<PollRoom id="test" />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Couldn’t load this poll",
  );
  expect(screen.queryByLabelText("Your question")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "try again" }));
  expect(onSnapshot).toHaveBeenCalledTimes(2);
});

test("a transaction response cannot replace newer live results", async () => {
  const original = pollData();
  onSnapshot.mockImplementation((ref, listener) => {
    snapshotListener = listener;
    listener(snapshot(original));
    return jest.fn();
  });
  let finish;
  runTransaction.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<PollRoom id="test" />);
  fireEvent.click(screen.getByRole("button", { name: "Vote for Pizza" }));
  act(() =>
    snapshotListener(
      snapshot({
        ...original,
        voters: ["me", "someone-else"],
        options: original.options.map((option) => ({ ...option, votes: 1 })),
      }),
    ),
  );
  await act(async () =>
    finish({
      ...original,
      voters: ["me"],
      options: [{ ...original.options[0], votes: 1 }, original.options[1]],
    }),
  );
  expect(screen.getByText("2 votes in total")).toBeInTheDocument();
  expect(screen.getAllByText("50%")).toHaveLength(2);
});

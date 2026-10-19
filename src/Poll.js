import React from "react";
import { useParams } from "react-router-dom";
import PollRoom from "./PollRoom";
import Header from "./Header";
import PageMeta from "./PageMeta";

export default function Poll() {
  const { id } = useParams();
  return (
    <div className="app-shell">
      <PageMeta title={`Poll ${id} · Wafflet`} room />
      <Header type="Poll" id={id} />
      <PollRoom key={id} id={id} />
    </div>
  );
}

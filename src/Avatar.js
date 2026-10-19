import React, { useState } from "react";
import { FiUser } from "react-icons/fi";

export default function Avatar({ uid, label, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className={`avatar ${className}`} role="img" aria-label={label}>
      <FiUser aria-hidden="true" />
      <img
        src={`https://robohash.org/${uid}?size=80x80`}
        alt=""
        aria-hidden="true"
        width="36"
        height="36"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </span>
  );
}

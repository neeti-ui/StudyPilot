import React from "react";

export default function SampleDataBadge({ text = "Sample data", size = "normal" }) {
  return (
    <span
      className={`sample-badge ${size === "small" ? "sample-badge-sm" : ""}`}
      title="This content is mock/sample data for UI testing and validation"
    >
      <span className="sample-badge-dot"></span>
      {text}
    </span>
  );
}

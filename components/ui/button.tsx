
import * as React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      style={{
        backgroundColor: "#000",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: "6px",
        border: "none",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

import type { ReactElement } from "react";

/** Inline monogram for header (matches public/favicon.svg). */
export function BrandMark(props: { className?: string }): ReactElement {
  const { className } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={24}
      height={24}
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="6" fill="#0d9488" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="system-ui,Segoe UI,sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="#f0fdfa"
      >
        OP
      </text>
    </svg>
  );
}

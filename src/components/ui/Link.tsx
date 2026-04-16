import NextLink from "next/link";
import type { ComponentProps } from "react";

interface LinkProps extends ComponentProps<typeof NextLink> {
  external?: boolean;
}

export default function Link({ external, className = "", children, ...rest }: LinkProps) {
  const base = "font-mono text-xs text-cyan-400 underline decoration-dotted underline-offset-2 hover:text-cyan-300 " + className;
  if (external) {
    return (
      <a href={String(rest.href)} target="_blank" rel="noopener noreferrer" className={base}>
        {children}
      </a>
    );
  }
  return <NextLink {...rest} className={base}>{children}</NextLink>;
}

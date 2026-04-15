interface VisuallyHiddenProps {
  children: React.ReactNode;
  as?: "span" | "div" | "label";
}

export default function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return (
    <Tag
      className="absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0"
      style={{ clip: "rect(0, 0, 0, 0)" }}
    >
      {children}
    </Tag>
  );
}

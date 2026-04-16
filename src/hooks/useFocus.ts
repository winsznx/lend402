import { useEffect, useRef, useState, type RefObject } from "react";

export function useFocus<T extends HTMLElement>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onFocus = () => setFocused(true);
    const onBlur = () => setFocused(false);
    node.addEventListener("focus", onFocus);
    node.addEventListener("blur", onBlur);
    return () => {
      node.removeEventListener("focus", onFocus);
      node.removeEventListener("blur", onBlur);
    };
  }, []);

  return [ref, focused];
}

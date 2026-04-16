import { useEffect } from "react";

export function useDocumentTitle(title: string, restoreOnUnmount: boolean = false): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    if (!restoreOnUnmount) return;
    return () => { document.title = previous; };
  }, [title, restoreOnUnmount]);
}

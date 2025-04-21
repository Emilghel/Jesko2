import * as React from "react";
import * as ReactDOM from "react-dom";

type PortalProps = {
  children: React.ReactNode;
  container?: HTMLElement;
};

export function Portal({
  children,
  container = document.body,
}: PortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? ReactDOM.createPortal(children, container) : null;
}
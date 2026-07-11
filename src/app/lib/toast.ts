// Tiny imperative toast store — a pub/sub any component or lib can call
// (toast.error(...) in a .catch) without hooks or context plumbing.
// ToastHost subscribes and renders the stack.

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; kind: ToastKind; message: string };

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let seq = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach(l => l([...toasts]));

// Auto-dismiss timers, so a toast can also be dismissed manually.
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function push(kind: ToastKind, message: string): number {
  const id = seq++;
  // Collapse an identical message that's already showing (avoids stacks of
  // the same "couldn't save" on repeated taps).
  toasts = toasts.filter(t => !(t.kind === kind && t.message === message));
  toasts = [...toasts, { id, kind, message }].slice(-3); // cap the stack
  emit();
  timers.set(id, setTimeout(() => dismissToast(id), kind === "error" ? 5000 : 3200));
  return id;
}

export function dismissToast(id: number): void {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); }
  toasts = toasts.filter(x => x.id !== id);
  emit();
}

export function subscribeToasts(l: Listener): () => void {
  listeners.add(l);
  l([...toasts]);
  return () => { listeners.delete(l); };
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};

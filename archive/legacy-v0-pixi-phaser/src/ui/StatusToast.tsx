export interface ToastMessage {
  id: number;
  text: string;
}

interface StatusToastProps {
  messages: ToastMessage[];
}

/**
 * Shows short-lived gameplay status messages.
 */
export function StatusToast({ messages }: StatusToastProps) {
  return (
    <div className="status-toast-stack" aria-live="polite" aria-label="状态提示">
      {messages.map((message) => (
        <div key={message.id} className="status-toast">
          {message.text}
        </div>
      ))}
    </div>
  );
}

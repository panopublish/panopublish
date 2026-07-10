import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export function WhatsAppButton() {
  const { user } = useAuth();
  const msg = `Hi, I need help with PanoPublish — my account email is ${user?.email ?? "(not signed in)"}`;
  return (
    <a
      href={waLink(msg)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-elegant transition-transform hover:scale-105"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

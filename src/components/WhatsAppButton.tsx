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
      className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-elegant transition-transform hover:scale-105"
    >
      <svg className="h-7 w-7 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.012 2c-5.506 0-9.97 4.463-9.97 9.97 0 1.954.563 3.778 1.533 5.326L2 22l4.863-1.277c1.492.812 3.197 1.277 5.013 1.277 5.506 0 9.97-4.462 9.97-9.97 0-5.506-4.464-9.97-9.97-9.97zm5.556 14.133c-.244.688-1.22 1.25-1.676 1.302-.38.043-.876.086-2.457-.544-2.022-.806-3.327-2.868-3.432-3.007-.105-.138-.857-1.14-.857-2.176 0-1.036.541-1.545.733-1.754.192-.209.418-.261.558-.261.14 0 .28 0 .401.006.126.006.297-.047.464.356.172.417.587 1.433.637 1.538.05.105.084.227.013.367-.07.14-.15.304-.253.424-.105.12-.22.268-.314.372-.105.115-.213.24-.092.449.122.209.544.897 1.164 1.448.799.71 1.472.93 1.68.102.209.116.33.105.452.122.122.017.525-.61.666-.818.14-.209.28-.174.47-.105.193.07 1.22.575 1.43.68.209.105.349.157.401.247.052.09.052.525-.192 1.213z" />
      </svg>
    </a>
  );
}

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const formatDateIN = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export const SUPPORT_PHONE = "+916394611967"; // replace with real number
export const waLink = (msg: string) => {
  const cleanPhone = SUPPORT_PHONE.replace(/[^0-9]/g, "");
  return `https://api.whatsapp.com/send?phone=${cleanPhone}${msg ? `&text=${encodeURIComponent(msg)}` : ""}`;
};

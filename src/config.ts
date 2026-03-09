export const CDN_BASE_URL = "https://cdn2.loldata.cc/16.1.1";
export const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "https://api.loldata.cc";
export const champPath = `${CDN_BASE_URL}/img/champion`;
export const SITE_URL =
  import.meta.env.VITE_SITE_URL || window.location.origin;
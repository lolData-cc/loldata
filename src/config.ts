export const CDN_BASE_URL = "https://cdn.loldata.cc/15.13.1";
export const API_BASE_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3001"
    : "https://api.loldata.cc";
export const champPath = `${CDN_BASE_URL}/img/champion`;

const RIDER_SESSION_KEY = "bmg_rider_session";

export const riderSession = {
  isLoggedIn: () => localStorage.getItem(RIDER_SESSION_KEY) === "1",
  setLoggedIn: () => localStorage.setItem(RIDER_SESSION_KEY, "1"),
  clear: () => localStorage.removeItem(RIDER_SESSION_KEY),
};


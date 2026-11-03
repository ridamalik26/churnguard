export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "themechange";

// Runs before first paint so a saved dark theme never flashes light on load.
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

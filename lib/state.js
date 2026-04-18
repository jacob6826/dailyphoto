import { getStore } from '@netlify/blobs';

const DEFAULT_STATE = {
  currentPhoto: null,
  currentDate: null,
  unshownPhotos: [],
  shownPhotos: []
};

// State logic using Netlify Blobs
export async function getState() {
  const store = getStore("state");
  try {
    // getJSON returns null if the key doesn't exist
    const data = await store.get("dailyState", { type: "json" });
    if (!data) {
      await saveState(DEFAULT_STATE);
      return DEFAULT_STATE;
    }
    return data;
  } catch (error) {
    console.error("Error reading state from blob store:", error);
    return DEFAULT_STATE;
  }
}

export async function saveState(state) {
  const store = getStore("state");
  await store.setJSON("dailyState", state);
}

// Logic to evaluate next photo
export async function updateDailyPhoto() {
  const state = await getState();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // If there are no photos at all, do nothing
  if (!state.currentPhoto && state.unshownPhotos.length === 0 && state.shownPhotos.length === 0) {
    return state;
  }

  // If the date is the same and we already have a photo, keep it
  if (state.currentDate === today && state.currentPhoto) {
    return state;
  }

  // Time to roll the cycle!
  let pool = [...state.unshownPhotos];
  
  // If pool is empty, reset from shownPhotos
  if (pool.length === 0 && state.shownPhotos.length > 0) {
    pool = [...state.shownPhotos];
    state.shownPhotos = [];
  }

  if (pool.length > 0) {
    // Pick random
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool.splice(randomIndex, 1)[0];

    // Move current photo to shown pool if it exists
    if (state.currentPhoto) {
      state.shownPhotos.push(state.currentPhoto);
    }
    
    state.currentPhoto = chosen;
    state.currentDate = today;
    state.unshownPhotos = pool;

    await saveState(state);
  }

  return state;
}

export async function addPhotoToPool(filename) {
  const state = await getState();
  state.unshownPhotos.push(filename);
  await saveState(state);
  
  // Try to start immediately if it's the very first photo
  if (!state.currentPhoto) {
    await updateDailyPhoto();
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "medicines";

// Get all medicines
export async function getMedicines() {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}
// Update one medicine by id
export async function updateMedicine(updatedMedicine) {
  try {
    const existing = await getMedicines();
    const updated = existing.map((m) =>
      m.id === updatedMedicine.id ? updatedMedicine : m,
    );
    await saveMedicines(updated);
  } catch (e) {
    console.log("Error updating", e);
  }
}

// Save all medicines
export async function saveMedicines(medicines) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(medicines));
  } catch (e) {
    console.log("Error saving", e);
  }
}

// Add one medicine
export async function addMedicine(medicine) {
  try {
    const existing = await getMedicines();
    const updated = [...existing, medicine];
    await saveMedicines(updated);
  } catch (e) {
    console.log("Error adding", e);
  }
}

// Delete one medicine by id
export async function deleteMedicine(id) {
  try {
    const existing = await getMedicines();
    const updated = existing.filter((m) => m.id !== id);
    await saveMedicines(updated);
  } catch (e) {
    console.log("Error deleting", e);
  }
}

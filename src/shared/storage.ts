import type { WidStorageKey, WidStorageSchema } from "./types";

export async function getStorageValue<Key extends WidStorageKey>(
  key: Key
): Promise<WidStorageSchema[Key] | undefined> {
  const result = await chrome.storage.local.get(key);
  return result[key] as WidStorageSchema[Key] | undefined;
}

export async function setStorageValue<Key extends WidStorageKey>(
  key: Key,
  value: WidStorageSchema[Key]
): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

export async function removeStorageValue(key: WidStorageKey): Promise<void> {
  await chrome.storage.local.remove(key);
}

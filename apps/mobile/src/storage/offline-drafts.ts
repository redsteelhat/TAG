import { getStoredJson, setStoredJson, storageKeys } from './local-storage';

export interface TripDraft {
  id: string;
  createdAt: string;
  grossIncome: string;
  note?: string;
  totalKm: string;
}

export async function listTripDrafts() {
  return (await getStoredJson<TripDraft[]>(storageKeys.tripDrafts)) ?? [];
}

export async function saveTripDraft(draft: Omit<TripDraft, 'createdAt' | 'id'>) {
  const currentDrafts = await listTripDrafts();
  const nextDraft: TripDraft = {
    ...draft,
    createdAt: new Date().toISOString(),
    id: createDraftId()
  };

  await setStoredJson(storageKeys.tripDrafts, [nextDraft, ...currentDrafts]);

  return nextDraft;
}

export async function removeTripDraft(id: string) {
  const currentDrafts = await listTripDrafts();
  await setStoredJson(
    storageKeys.tripDrafts,
    currentDrafts.filter((draft) => draft.id !== id)
  );
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

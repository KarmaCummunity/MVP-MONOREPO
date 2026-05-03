import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { USE_BACKEND } from '../../utils/dbConfig';
import { resolveExternalProfileUser } from './profileExternalUserResolution';
import type { CharacterType } from './profileScreenTypes';

type Params = Readonly<{
  isOwnProfile: boolean;
  externalUserId: string | undefined;
  externalUserName: string | undefined;
  externalCharacterData: CharacterType | undefined;
}>;

export function useProfileViewingUser({
  isOwnProfile,
  externalUserId,
  externalUserName,
  externalCharacterData,
}: Params): Readonly<{
  viewingUser: CharacterType | null;
  setViewingUser: Dispatch<SetStateAction<CharacterType | null>>;
  loadingUser: boolean;
}> {
  const [viewingUser, setViewingUser] = useState<CharacterType | null>(externalCharacterData ?? null);
  const [loadingUser, setLoadingUser] = useState(!isOwnProfile && !externalCharacterData);

  useEffect(() => {
    if (isOwnProfile || externalUserId === undefined || externalUserId === '') {
      return;
    }
    const stableExternalUserId: string = externalUserId;

    let cancelled = false;
    const needsRemoteFetch = !externalCharacterData && USE_BACKEND;

    async function run(): Promise<void> {
      setLoadingUser(needsRemoteFetch);
      const next = await resolveExternalProfileUser({
        externalUserId: stableExternalUserId,
        externalUserName,
        externalCharacterData,
      });
      if (!cancelled) {
        setViewingUser(next);
        setLoadingUser(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [externalUserId, externalUserName, externalCharacterData, isOwnProfile]);

  return { viewingUser, setViewingUser, loadingUser };
}

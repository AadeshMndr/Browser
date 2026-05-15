import { useLocalStorage } from "@raycast/utils";

import { STORAGE_KEY } from "./constants";
import { SearchResultList } from "./SearchResultList";
import type { BrowserProfile, CommandProps } from "./types";

export default function Command(props: CommandProps) {
  const { value: profiles = [], setValue: setProfiles, isLoading } = useLocalStorage<BrowserProfile[]>(STORAGE_KEY, []);
  const profileHint = props.arguments.profile?.trim() ?? "";

  return (
    <SearchResultList
      query={props.arguments.query.trim()}
      profileHint={profileHint}
      profiles={profiles}
      setProfiles={setProfiles}
      isLoading={isLoading}
    />
  );
}

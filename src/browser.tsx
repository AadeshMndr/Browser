import { Action, ActionPanel, Form, LaunchProps, List, Toast, open, showToast } from "@raycast/api";
import { runAppleScript, showFailureToast, useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";

type BrowserProfile = {
  id: string;
  name: string;
  browserApp: string;
  profileDirectory: string;
  isDefault?: boolean;
};

type ProfileFormValues = {
  name: string;
  browserApp: string;
  profileDirectory: string;
  isDefault: boolean;
};

type ProfileManagerProps = {
  profiles: BrowserProfile[];
  setProfiles: (profiles: BrowserProfile[]) => Promise<void>;
};

type ProfileEditorProps = ProfileManagerProps & {
  profile?: BrowserProfile;
};

const STORAGE_KEY = "browser-profiles";
const DEFAULT_BROWSER_ITEM_ID = "default-browser";

function makeProfileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function matchesProfileHint(profile: BrowserProfile, normalizedHint: string) {
  if (!normalizedHint) {
    return true;
  }

  return [profile.name, profile.browserApp, profile.profileDirectory]
    .map((value) => normalize(value))
    .some((value) => value.includes(normalizedHint));
}

function findProfileByHint(profiles: BrowserProfile[], hint: string) {
  const normalizedHint = normalize(hint);

  if (!normalizedHint) {
    return undefined;
  }

  const exactMatch = profiles.find((profile) =>
    [profile.name, profile.browserApp, profile.profileDirectory]
      .map((value) => normalize(value))
      .some((value) => value === normalizedHint),
  );

  if (exactMatch) {
    return exactMatch;
  }

  return profiles.find((profile) => matchesProfileHint(profile, normalizedHint));
}

function sortProfiles(profiles: BrowserProfile[]) {
  return [...profiles].sort((left, right) => {
    if (left.isDefault && !right.isDefault) {
      return -1;
    }

    if (!left.isDefault && right.isDefault) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  });
}

function upsertProfile(profiles: BrowserProfile[], profile: BrowserProfile) {
  const nextProfiles = profiles.some((entry) => entry.id === profile.id)
    ? profiles.map((entry) => (entry.id === profile.id ? profile : entry))
    : [...profiles, profile];

  return sortProfiles(nextProfiles);
}

function setDefaultProfile(profiles: BrowserProfile[], defaultId: string) {
  return profiles.map((profile) => ({
    ...profile,
    isDefault: profile.id === defaultId,
  }));
}

function buildSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;
}

function buildProfileLaunchScript() {
  return `
on run argv
  set browserApp to item 1 of argv
  set profileDirectory to item 2 of argv
  set targetUrl to item 3 of argv

  do shell script "open -na " & quoted form of browserApp & " --args --profile-directory=" & quoted form of profileDirectory & " " & quoted form of targetUrl
end run
`;
}

async function openSearch(query: string, profile?: BrowserProfile) {
  const targetUrl = buildSearchUrl(query);

  if (!profile) {
    await open(targetUrl);
    return;
  }

  await runAppleScript(buildProfileLaunchScript(), [profile.browserApp, profile.profileDirectory, targetUrl], {
    timeout: 10000,
  });
}

type CommandProps = LaunchProps<{ arguments: { query: string; profile?: string } }>;

function ProfileEditor({ profile, profiles, setProfiles }: ProfileEditorProps) {
  const isEditing = Boolean(profile);
  const defaultValue = profile?.isDefault ?? profiles.length === 0;

  async function handleSubmit(values: ProfileFormValues) {
    const name = values.name.trim();
    const browserApp = values.browserApp.trim();
    const profileDirectory = values.profileDirectory.trim();

    if (!name || !browserApp || !profileDirectory) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing profile details",
        message: "Fill in the profile name, browser app, and profile directory.",
      });
      return;
    }

    const nextProfile: BrowserProfile = {
      id: profile?.id ?? makeProfileId(),
      name,
      browserApp,
      profileDirectory,
      isDefault: values.isDefault,
    };

    let nextProfiles = sortProfiles(upsertProfile(profiles, nextProfile));

    if (nextProfile.isDefault) {
      nextProfiles = setDefaultProfile(nextProfiles, nextProfile.id);
    }

    await setProfiles(nextProfiles);
    await showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Profile updated" : "Profile saved",
      message: `${name} is ready to use.`,
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Save Profile" : "Add Profile"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a browser app name and the profile directory or profile name it uses. For Chrome and Edge, this is usually something like Default or Profile 1." />
      <Form.TextField id="name" title="Profile Name" defaultValue={profile?.name ?? "Work"} placeholder="Work" />
      <Form.TextField
        id="browserApp"
        title="Browser App"
        defaultValue={profile?.browserApp ?? "Google Chrome"}
        placeholder="Google Chrome"
      />
      <Form.TextField
        id="profileDirectory"
        title="Profile Directory"
        defaultValue={profile?.profileDirectory ?? "Profile 1"}
        placeholder="Profile 1"
      />
      <Form.Checkbox
        id="isDefault"
        title="Default Profile"
        label="Use this profile as the default selection"
        defaultValue={defaultValue}
      />
    </Form>
  );
}

function ProfileManager({ profiles, setProfiles }: ProfileManagerProps) {
  async function removeProfile(profileId: string) {
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    await setProfiles(nextProfiles);
    await showToast({
      style: Toast.Style.Success,
      title: "Profile removed",
    });
  }

  async function makeDefault(profileId: string) {
    await setProfiles(
      profiles.map((profile) => ({
        ...profile,
        isDefault: profile.id === profileId,
      })),
    );
    await showToast({
      style: Toast.Style.Success,
      title: "Default profile updated",
    });
  }

  return (
    <List searchBarPlaceholder="Filter browser profiles">
      <List.EmptyView
        title="No browser profiles yet"
        description="Add one profile to reuse it from the search form."
        actions={
          <ActionPanel>
            <Action.Push title="Add Profile" target={<ProfileEditor profiles={profiles} setProfiles={setProfiles} />} />
          </ActionPanel>
        }
      />
      {sortProfiles(profiles).map((profile) => (
        <List.Item
          key={profile.id}
          title={profile.name}
          subtitle={`${profile.browserApp} · ${profile.profileDirectory}${profile.isDefault ? " · Default" : ""}`}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Profile"
                target={<ProfileEditor profile={profile} profiles={profiles} setProfiles={setProfiles} />}
              />
              <Action title="Make Default" onAction={() => makeDefault(profile.id)} />
              <Action title="Delete Profile" onAction={() => removeProfile(profile.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type SearchResultListProps = ProfileManagerProps & {
  isLoading: boolean;
  query: string;
  profileHint: string;
};

function SearchResultList({ query, profileHint, profiles, setProfiles, isLoading }: SearchResultListProps) {
  const [profileFilter, setProfileFilter] = useState(profileHint);

  const sortedProfiles = useMemo(() => sortProfiles(profiles), [profiles]);
  const profileFromArgument = useMemo(
    () => findProfileByHint(sortedProfiles, profileHint),
    [sortedProfiles, profileHint],
  );

  const filteredProfiles = useMemo(() => {
    const normalizedFilter = normalize(profileFilter);

    if (!normalizedFilter) {
      return sortedProfiles;
    }

    return sortedProfiles.filter((profile) => matchesProfileHint(profile, normalizedFilter));
  }, [sortedProfiles, profileFilter]);

  const normalizedFilter = normalize(profileFilter);
  const showDefaultBrowserItem = !normalizedFilter || "default browser".includes(normalizedFilter);

  async function makeDefaultProfile(profile: BrowserProfile) {
    await setProfiles(setDefaultProfile(sortProfiles(upsertProfile(profiles, profile)), profile.id));
  }

  async function deleteProfile(profileId: string) {
    await setProfiles(profiles.filter((entry) => entry.id !== profileId));
  }

  async function launchSearch(profile?: BrowserProfile) {
    try {
      await openSearch(query, profile);
      await showToast({
        style: Toast.Style.Success,
        title: profile ? `Opened in ${profile.name}` : "Opened in default browser",
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could not open browser search" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder="Filter profiles like a dropdown"
      searchText={profileFilter}
      onSearchTextChange={setProfileFilter}
      selectedItemId={
        profileFromArgument?.id ?? (showDefaultBrowserItem ? DEFAULT_BROWSER_ITEM_ID : filteredProfiles[0]?.id)
      }
    >
      {query.length === 0 ? (
        <List.EmptyView
          title="Type your search query when launching Browser"
          description="Open the command with text after its name, then pick a browser profile from the list."
          actions={
            <ActionPanel>
              <Action.Push
                title="Manage Profiles"
                target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <>
          <List.Section title={`Search for ${query}`}>
            {showDefaultBrowserItem ? (
              <List.Item
                id={DEFAULT_BROWSER_ITEM_ID}
                title="Default browser"
                subtitle={buildSearchUrl(query)}
                actions={
                  <ActionPanel>
                    <Action title="Search" onAction={() => launchSearch()} />
                    <Action.Push
                      title="Manage Profiles"
                      target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                    />
                  </ActionPanel>
                }
              />
            ) : null}
            {filteredProfiles.map((profile) => (
              <List.Item
                key={profile.id}
                id={profile.id}
                title={profile.name}
                subtitle={`${profile.browserApp} · ${profile.profileDirectory}${profile.isDefault ? " · Default" : ""}`}
                accessories={profileFromArgument?.id === profile.id ? [{ tag: { value: "From argument" } }] : undefined}
                actions={
                  <ActionPanel>
                    <Action title="Search" onAction={() => launchSearch(profile)} />
                    <Action.Push
                      title="Edit Profile"
                      target={<ProfileEditor profile={profile} profiles={profiles} setProfiles={setProfiles} />}
                    />
                    <Action title="Make Default" onAction={() => makeDefaultProfile(profile)} />
                    <Action title="Delete Profile" onAction={() => deleteProfile(profile.id)} />
                    <Action.Push
                      title="Manage Profiles"
                      target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
          {!showDefaultBrowserItem && filteredProfiles.length === 0 ? (
            <List.EmptyView
              title="No matching profile"
              description="Change the profile argument or filter text, or create a new profile."
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Manage Profiles"
                    target={<ProfileManager profiles={profiles} setProfiles={setProfiles} />}
                  />
                </ActionPanel>
              }
            />
          ) : null}
        </>
      )}
    </List>
  );
}

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

import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

import type { BrowserProfile } from "./types";

export function buildSearchUrl(query: string) {
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

export async function openSearch(query: string, profile?: BrowserProfile) {
  const targetUrl = buildSearchUrl(query);

  if (!profile) {
    await open(targetUrl);
    return;
  }

  await runAppleScript(buildProfileLaunchScript(), [profile.browserApp, profile.profileDirectory, targetUrl], {
    timeout: 10000,
  });
}

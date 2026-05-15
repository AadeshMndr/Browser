# Browser

Search the web in your default browser or launch the same query in a saved browser profile.

## How it works

Type your query as the command argument when you launch Browser. The command then shows a profile picker, with your default browser at the top and any saved profiles below it.

You can also pass an optional profile argument (for Quicklinks). The picker uses that value as an initial filter and preselects the closest profile match, while still letting you pick another profile from the list.

## Profile setup

1. Open the command and type the query you want to search.
2. Optionally provide a profile argument (for example, `Work`) if launching via Quicklink.
3. Choose a browser profile from the list.
4. Open `Manage Profiles` if you want to add, edit, or delete saved profiles.
5. Add a profile name, browser app name, and profile directory.
6. Mark one profile as the default if you want it preselected in the picker.

## Notes

This profile launcher uses the browser app name plus the profile directory string. For Chromium-based browsers, that is usually something like `Default` or `Profile 1`.
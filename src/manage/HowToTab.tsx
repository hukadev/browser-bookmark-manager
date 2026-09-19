import { cardBodyClass, cardClass } from '../lib/ui-classes'

function HowToCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={cardClass}>
      <div className={cardBodyClass}>
        <h3 className="font-bold text-lg">{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function HowToTab() {
  return (
    <div className="flex flex-col gap-4">
      <HowToCard title="🔖 Adding & editing bookmarks">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            If you want to save a bookmark with tags, click the extension icon, add tags in the Tags field (press
            Enter or comma to add each tag), choose a folder, and click "Save Bookmark".
          </li>
          <li>
            If you want to update an existing bookmark, open the extension popup on that page — it will detect the
            existing bookmark and let you modify its tags, title, or folder.
          </li>
          <li>
            If you want to edit a bookmark's title, URL, folder, tags, or note, hover a bookmark on the All
            Bookmarks tab, click "Edit", make your changes, and click "Save".
          </li>
        </ul>
      </HowToCard>

      <HowToCard title="🔍 Searching & filtering">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            If you want to quickly search your bookmarks, press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux) to
            open the search popup, then start typing.
          </li>
          <li>
            If you want to filter bookmarks by tag, type #tagname in the search box (e.g., #work), or click a tag in
            the tag bar on this page.
          </li>
          <li>
            If you want to filter by multiple tags, click multiple tags in the tag bar — bookmarks must match all
            selected tags.
          </li>
          <li>
            If you want to filter bookmarks by folder, click any folder name in a bookmark's folder path (e.g.,
            click "Projects" in 📁 Bookmarks Bar / Projects), or click a folder in the sidebar.
          </li>
          <li>If you want to clear all filters, click the "Clear all" button in the active filters bar.</li>
          <li>If you want to see all available tags, click "Show all" in the tag bar to expand it.</li>
        </ul>
      </HowToCard>

      <HowToCard title="📁 Archiving & organizing">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            If you want to archive a bookmark, click the "Archive" button next to it. It will be moved to the
            Archive folder and hidden from the default view.
          </li>
          <li>
            If you want to archive multiple bookmarks at once, select them with checkboxes and click "Archive".
          </li>
          <li>
            If you want to see archived bookmarks, turn on the "Include archived" toggle next to the search bar.
          </li>
          <li>
            If you want to create an Archive folder, click the "Create Archive Folder" button (shown when no
            Archive folder exists).
          </li>
          <li>
            If you want to move bookmarks to a different folder, select them with checkboxes, pick a folder under
            "Move:", and click "Move".
          </li>
          <li>
            If you want to add or remove tags on many bookmarks at once, select them with checkboxes, type tags
            under "Tags:", then click "+Add", "-Remove", or "Remove Tags".
          </li>
        </ul>
      </HowToCard>

      <HowToCard title="🗑️ Deleting bookmarks">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            If you want to delete a bookmark from this page, click the "Delete" button, then click "Confirm?" to
            confirm.
          </li>
          <li>
            If you want to delete a bookmark from the search popup, hover over it to reveal the X button, click it,
            then click the checkmark to confirm.
          </li>
          <li>If you want to delete multiple bookmarks at once, select them with checkboxes and click "Delete".</li>
        </ul>
      </HowToCard>

      <HowToCard title="🔗 Finding duplicates">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>
            If you want to find duplicate bookmarks, switch to the "Find Duplicates" tab. Duplicates are detected
            automatically using smart URL matching.
          </li>
          <li>
            If you want to clean up duplicates, select which copy to keep with the radio button, then click "Delete
            Others" for that group.
          </li>
          <li>
            If you want to clean all duplicates at once, click "Clean All Duplicates" at the bottom of the page.
          </li>
        </ul>
      </HowToCard>

      <HowToCard title="⌨️ Keyboard shortcuts">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Cmd+Shift+P (Mac) / Ctrl+Shift+P (Windows/Linux) — open search popup</li>
          <li>↑ / ↓ — navigate search results</li>
          <li>Enter — open selected bookmark</li>
        </ul>
      </HowToCard>

      <HowToCard title="How tags and notes work">
        <p>
          Tags are stored directly in the bookmark title as [tag1][tag2], and notes as ((note: ...)). No cloud
          storage or account is needed — everything stays in your browser. Tags and notes are preserved when you
          sync bookmarks through Chrome's built-in sync. The only exception is Automation rule definitions, which
          are configuration, not bookmark data, and are kept in this browser's local extension storage instead (so
          they do not sync across devices).
        </p>
      </HowToCard>

      <HowToCard title="Finding and cleaning duplicates">
        <p>
          The Find Duplicates tab groups bookmarks whose URLs match after normalizing: http and https are treated
          the same, a trailing slash is ignored, a leading "www." is stripped, and tracking parameters (utm_*,
          gclid, fbclid, msclkid, mc_cid, mc_eid) are removed before comparing.
        </p>
      </HowToCard>
    </div>
  )
}

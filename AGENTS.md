<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The authenticated experience uses one shared royal-blue AppShell for desktop sidebar and mobile bottom navigation, so route pages must compose inside it rather than creating independent navigation chrome.
- Account recovery uses emailed one-time reset links and a public password-reset route; shared recovery codes are forbidden because they enable account takeover.
- Sign-up eligibility (only emails ending in 26@students.dkut.ac.ke) is enforced both in the sign-up form and by a BEFORE INSERT trigger on auth.users; when connecting a new backend, re-apply that trigger and keep the two in sync.
- Images the app displays (logo, campus photo, team photos) are bundled from src/assets as real files, never Lovable CDN (.asset.json) pointers, so they also load on the user's separate Vercel deployment.

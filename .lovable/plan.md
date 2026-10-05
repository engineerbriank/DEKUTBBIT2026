# Blue reference-matched platform redesign

## Goal
Restyle the existing platform to closely match the uploaded blue mobile dashboard while preserving every working feature, permission, route, and live-data connection.

## Build
- Replace the shared green-and-mint visual tokens with the reference’s royal-blue, pale-blue, white, and navy system in light and dark modes.
- Rework the shared authenticated shell so every signed-in page inherits the blue header, blue desktop navigation, mobile bottom navigation, logo treatment, alerts, spacing, and card styling.
- Match the dashboard composition: branded header, blue greeting banner, two-column summary cards, today’s classes, announcement rows, and fixed mobile navigation.
- Keep the current desktop layout polished and consistent rather than stretching the mobile screenshot unchanged.
- Preserve all existing live counts, user data, links, downloads, uploads, admin permissions, AI tools, and backend calls.

## Technical details
- Update semantic tokens and shared utilities in the global stylesheet; page code will continue using semantic classes.
- Update the shared shell and dashboard only where structure must change, so all other pages receive the redesign without functional rewrites.
- Keep responsive behavior for phones, tablets, and desktop, including safe-area handling and non-overlapping fixed navigation.
- Update the project architecture note and roadmap to reflect the new shared blue visual system.

## Verification
- Check the current build and route metadata.
- Test the public sign-in screen plus authenticated dashboard on mobile and desktop when a test session is available.
- Confirm navigation, live cards, alerts, page switching, and dark mode remain usable with no visible overlap or clipped text.

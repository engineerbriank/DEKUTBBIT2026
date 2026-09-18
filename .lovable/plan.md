# Group, contact, logo, and profile photo improvements

## What will change

- Fix study-group creation so valid WhatsApp invite links are accepted, normalized, saved, and opened reliably after approval.
- Add an optional group logo upload with image preview, validation, secure storage, and display on group lists, details, and administrator review.
- Add an optional passport/profile photo upload with preview, replacement, secure storage, and display across the profile, navigation, member lists, and group members.
- Make class-representative contact reliable with a WhatsApp link for **0142324891** and an email link for **bbitclassrep@gmail.com**.
- Replace the current brand logo everywhere with the uploaded DEKUT BBIT 2026 Student Hub image, including the browser icon.
- Rebalance the landing page: place the platform name at the top and center the main heading, text, and account buttons.

## Data and access

- Add image-path fields to profiles and study groups without removing existing data.
- Use private image storage with authenticated upload/read rules; users can manage their own profile photo and group creators can manage their group logo.
- Keep administrator approval, leader selection, group membership, and private WhatsApp access unchanged.
- Validate image type and size in the page and again before saving paths.

## Verification

- Create a group with common WhatsApp invite-link formats and confirm the creator is registered automatically.
- Upload and display a group logo, then confirm it appears in the administrator review and approved group views.
- Upload and replace a profile photo, then verify it appears on profile and member views.
- Open both class-representative WhatsApp and email links.
- Check the landing page and signed-in navigation on phone and desktop sizes, including the new logo and centered layout.

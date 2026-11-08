# Security Specification for Aura

## Data Invariants
1. A user profile must have a valid email matching their auth token.
2. A match must involve two distinct users.
3. Feedback can only be submitted for a match that the user participated in.
4. Lesson completions are private to the user.
5. Points can only be incremented, not arbitrarily set, through valid actions (though Firestore rules are limited here, we will enforce schema checks).

## The Dirty Dozen (Attack Payloads)
1. **Identity Theft**: Attempting to create a user profile with a different UID than the authenticated user.
2. **Email Spoofing**: Attempting to set an email in the profile that doesn't match the auth token email.
3. **Point Injection**: Manually setting `points: 999999` during profile creation or update.
4. **Ghost Feedback**: Submitting feedback for a match that doesn't exist or that the user wasn't part of.
5. **Unauthorized Match Deletion**: Attempting to delete a match record between two other users.
6. **Achievement Hijacking**: Unlocking an achievement for another user.
7. **Lesson Forgery**: Attempting to create or edit a lesson as a user who isn't the author.
8. **PII Leak**: Accessing another user's private settings (if any were present, but currently profiles are public for the exchange).
9. **ID Poisoning**: Using a 2KB string as a document ID for a new user.
10. **State Skipping**: Manually setting a match status to 'completed' without fulfilling the logic.
11. **Shadow Fields**: Adding an `isAdmin: true` field to a user document that shouldn't have it.
12. **Spam Matches**: Creating hundreds of match requests in a tight loop (we'll limit match creation if possible, but Firestore rules are best at schema validation).

## Test Runner Plan
I will use `firestore.rules.test.ts` to verify these invariants.

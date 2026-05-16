# Security Specification for Shate

## Data Invariants
1. A Message must belong to a Session.
2. A Session must have an owner (`userId`).
3. Only the Session owner can read or write messages in that session.
4. Messages must have a `role` of "user" or "bot".
5. Timestamps must be validated against `request.time`.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a session for another user.
2. **Access Violation**: Read messages from a session that belongs to another UID.
3. **Ghost Field Injection**: Add an `isAdmin: true` field to a session document.
4. **Invalid Role**: Set `role: "admin"` in a message.
5. **Timestamp Manipulation**: Set `createdAt` to a date in the future.
6. **Orphaned Message**: Create a message in a session that doesn't exist.
7. **Resource Poisoning**: Use a 1MB string as a session ID.
8. **PII Leak**: Access a user's session list without auth.
9. **Mutation Gap**: Update a bot message's `content` after it's been finalized (hypothetical).
10. **Self-Promotion**: Attempt to write to a hypothetical `admins` collection.
11. **Negative Size**: Attempt to send a message with content size of -1 or extremely large.
12. **Query Scraping**: Attempt to list ALL sessions in the database.

## Red Team Conflict Report
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
|------------|-------------------|-------------------|--------------------|
| sessions   | Blocked (userId check) | N/A | Blocked (isValidId) |
| messages   | Blocked (Master Gate) | Blocked (isValidRole) | Blocked (size check) |

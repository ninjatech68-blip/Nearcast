/**
 * Initials for an avatar, from whatever name the person actually gave.
 *
 * Lives here rather than in a screen because two places draw the same
 * avatar — the profile sheet and the dot in every header — and they
 * disagreed: the dot was hard-coded to "PS", so every tester saw one
 * particular person's initials on their own profile button.
 *
 * Onboarding asks for a first name only, so "Piyush" -> "PI" and
 * "Piyush Sharma" -> "PS". A name we do not have yet is "?" — never a
 * placeholder that looks like somebody.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

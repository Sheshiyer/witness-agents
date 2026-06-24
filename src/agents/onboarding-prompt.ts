/**
 * onboarding-prompt.ts
 *
 * Fixed agent prompt for conversational user onboarding.
 * Collects birth data one field at a time rather than asking for everything upfront.
 *
 * Design principles:
 *   - One question per turn (no form dumps)
 *   - Validate immediately, clarify gently
 *   - Geocode city → lat/long/timezone automatically
 *   - Confirm before generating the reading
 *   - Respect the Euclidean-runtime vs non-Euclidean-Noesis boundary:
 *     this prompt collects facts; it does not interpret them.
 *
 * Usage:
 *   const session = createOnboardingSession();
 *   const { system, user } = session.nextTurn(userMessage);
 */

import type { BirthData } from '../types/engine.js';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type OnboardingStep =
  | 'welcome'
  | 'name'
  | 'birth-date'
  | 'birth-time'
  | 'birth-location'
  | 'confirm-timezone'
  | 'confirm-all'
  | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  name: string | null;
  date: string | null;
  time: string | null;
  locationText: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  attempts: number;
  history: Array<{ role: 'agent' | 'user'; text: string }>;
}

export interface OnboardingTurn {
  system: string;
  user: string;
  state: OnboardingState;
  birthData?: BirthData;
  ready: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════

const ONBOARDING_SYSTEM_PROMPT = `You are the Witness Onboarding Agent.

## Your Role
Guide a new user through entering their birth details ONE FIELD AT A TIME.
You never ask for more than one piece of information in a single message.
You are warm, concise, and precise. You do not interpret astrology, human design, or any consciousness system. You only collect facts.

## Conversation Flow (strict order)
1. Welcome — introduce the witness reading and ask for their name.
2. Name — accept any name or nickname. This is for personalization only.
3. Birth Date — ask for date in YYYY-MM-DD format. If unclear, ask again.
4. Birth Time — ask for time in HH:MM (24h). If unknown, note "unknown" and move on.
5. Birth Location — ask for city and country. You will geocode this later.
6. Confirm Timezone — state the detected timezone and ask for confirmation.
7. Confirm All — present a clean summary and ask: "Shall I generate your reading?"
8. Complete — acknowledge and hand off to the interpretation pipeline.

## Validation Rules
- Date: must be parsable as YYYY-MM-DD. Reject future dates (> today). Reject dates before 1900.
- Time: must be HH:MM (00:00–23:59). Accept "unknown" or "approximate".
- Location: accept any city/country string. Do not reject unless obviously nonsensical.
- Timezone: IANA format (e.g. Asia/Kolkata, America/New_York). Present for confirmation.

## Tone
Warm, minimal, human. One short paragraph per turn. No bullet lists. No jargon.
Never say "Please provide your..." — say "What name should I use?" or "What time were you born?"

## Boundaries
- Do NOT explain what a nakshatra, dasha, or human design type is.
- Do NOT guess or fill in fields the user hasn't given.
- Do NOT proceed to the next step until the current field is resolved.
- If the user tries to dump all data at once ("I was born 1990-01-01 in Mumbai at 6am"), thank them, then extract and confirm each field in sequence anyway.
`;

// ═══════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════

export function createOnboardingSession(): OnboardingState {
  return {
    step: 'welcome',
    name: null,
    date: null,
    time: null,
    locationText: null,
    latitude: null,
    longitude: null,
    timezone: null,
    attempts: 0,
    history: [],
  };
}

/**
 * Advance the onboarding state machine by one turn.
 *
 * @param state - Current onboarding state
 * @param userMessage - The user's latest message
 * @param geocodeFn - Optional async function: (city, country) => { lat, lng, tz }
 * @returns The next turn (system prompt + user context + updated state)
 */
export async function nextOnboardingTurn(
  state: OnboardingState,
  userMessage: string,
  geocodeFn?: (location: string) => Promise<{ latitude: number; longitude: number; timezone: string } | null>,
): Promise<OnboardingTurn> {
  // Record user input
  state.history.push({ role: 'user', text: userMessage });

  // Extract any structured data the user might have provided
  const extracted = extractFields(userMessage);

  // Merge extracted data into state based on current step
  switch (state.step) {
    case 'welcome':
      if (extracted.name) state.name = extracted.name;
      // If we already got a name in the welcome message, skip to birth-date
      state.step = state.name ? 'birth-date' : 'name';
      break;

    case 'name':
      if (extracted.name) state.name = extracted.name;
      if (!state.name && userMessage.trim().length < 30 && !userMessage.match(/\d/) && !userMessage.match(/\b(born|in|at|from|city|country|date|time)\b/i)) {
        state.name = userMessage.trim() || 'Guest';
      }
      if (!state.name) {
        // User sent something that doesn't look like a name; ask again
        return buildTurn(state, `What name should I use for your reading?`);
      }
      state.step = 'birth-date';
      break;

    case 'birth-date':
      if (extracted.date && isValidDate(extracted.date)) {
        state.date = extracted.date;
        state.step = 'birth-time';
      } else {
        state.attempts++;
        return buildTurn(state, `I need a valid date to continue. What date were you born? (YYYY-MM-DD format)`);
      }
      break;

    case 'birth-time':
      if (extracted.time === 'unknown' || extracted.time === null) {
        state.time = null;
        state.step = 'birth-location';
      } else if (extracted.time && isValidTime(extracted.time)) {
        state.time = extracted.time;
        state.step = 'birth-location';
      } else {
        state.attempts++;
        return buildTurn(state, `Could you share your birth time in HH:MM format? (e.g. 14:30). If you're not sure, just say "unknown".`);
      }
      break;

    case 'birth-location':
      if (extracted.location) {
        state.locationText = extracted.location;
        if (geocodeFn) {
          const geo = await geocodeFn(extracted.location);
          if (geo) {
            state.latitude = geo.latitude;
            state.longitude = geo.longitude;
            state.timezone = geo.timezone;
          }
        }
        state.step = 'confirm-timezone';
      } else {
        state.attempts++;
        return buildTurn(state, `Where were you born? (City, Country)`);
      }
      break;

    case 'confirm-timezone':
      // User confirms or corrects timezone
      if (/no|wrong|incorrect|change/i.test(userMessage)) {
        state.step = 'birth-location';
        return buildTurn(state, `No problem. What city and country were you born in?`);
      }
      state.step = 'confirm-all';
      break;

    case 'confirm-all':
      if (/yes|sure|ok|go|generate|proceed/i.test(userMessage)) {
        state.step = 'complete';
      } else {
        state.step = 'welcome';
        return buildTurn(state, `Let me collect your details again. What name should I use?`);
      }
      break;

    case 'complete':
      // Stay complete
      break;
  }

  // Build agent response based on new step
  const agentText = buildAgentResponse(state);
  state.history.push({ role: 'agent', text: agentText });

  // If complete, construct BirthData
  let birthData: BirthData | undefined;
  let ready = false;
  if (state.step === 'complete' && state.date && state.latitude !== null && state.longitude !== null) {
    birthData = {
      name: state.name || undefined,
      date: state.date,
      time: state.time || undefined,
      latitude: state.latitude,
      longitude: state.longitude,
      timezone: state.timezone || 'UTC',
    };
    ready = true;
  }

  return {
    system: ONBOARDING_SYSTEM_PROMPT,
    user: `Current step: ${state.step}\nUser said: "${userMessage}"\n\nCollected so far: ${JSON.stringify({
      name: state.name,
      date: state.date,
      time: state.time,
      location: state.locationText,
      timezone: state.timezone,
    })}\n\nRespond as the Witness Onboarding Agent.`,
    state,
    birthData,
    ready,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════

function buildTurn(state: OnboardingState, agentText: string): OnboardingTurn {
  state.history.push({ role: 'agent', text: agentText });
  return {
    system: ONBOARDING_SYSTEM_PROMPT,
    user: `Current step: ${state.step}\nUser said: "${state.history[state.history.length - 2]?.text || ''}"\n\nRespond as the Witness Onboarding Agent.`,
    state,
    ready: false,
  };
}

function buildAgentResponse(state: OnboardingState): string {
  switch (state.step) {
    case 'welcome':
      return `Welcome. I'm here to prepare your personal witness reading. Let's begin with your name.`;

    case 'name':
      return state.name
        ? `Thanks, ${state.name}. What date were you born? (YYYY-MM-DD)`
        : `What name should I use for your reading?`;

    case 'birth-date':
      return `What date were you born? Please use YYYY-MM-DD format.`;

    case 'birth-time':
      return `What time were you born? (HH:MM, 24-hour format). If you're not sure, just say "unknown".`;

    case 'birth-location':
      return `Where were you born? (City, Country)`;

    case 'confirm-timezone': {
      const tz = state.timezone || 'UTC';
      return `Based on ${state.locationText}, your timezone looks like ${tz}. Does that sound right?`;
    }

    case 'confirm-all': {
      const parts = [
        state.name ? `Name: ${state.name}` : '',
        `Date: ${state.date}`,
        state.time ? `Time: ${state.time}` : 'Time: unknown',
        `Location: ${state.locationText}`,
        `Timezone: ${state.timezone || 'UTC'}`,
      ].filter(Boolean);
      return `Here's what I have:\n\n${parts.join('\n')}\n\nShall I generate your reading?`;
    }

    case 'complete':
      return `Preparing your witness reading now. This may take a moment.`;

    default:
      return `Let's continue.`;
  }
}

function extractFields(text: string): {
  name: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
} {
  const result = { name: null as string | null, date: null as string | null, time: null as string | null, location: null as string | null };

  // Date: YYYY-MM-DD
  const dateMatch = text.match(/\b(\d{4})[\-/](\d{1,2})[\-/](\d{1,2})\b/);
  if (dateMatch) {
    const [_, y, m, d] = dateMatch;
    result.date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Time: HH:MM
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    result.time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }
  if (/unknown|not sure|don't know|unsure/i.test(text)) {
    result.time = 'unknown';
  }

  // Location: "City, Country" or "City Country"
  const locMatch = text.match(/(?:born\s+in|from|at|in)\s+([A-Za-z\s]+(?:,\s*[A-Za-z\s]+)?)/i);
  if (locMatch) {
    result.location = locMatch[1].trim();
  } else if (text.split(',').length >= 2 && text.length < 80) {
    // Heuristic: short text with a comma might be "City, Country"
    result.location = text.trim();
  }

  // Name: if short and no numbers/dates, treat as name
  if (text.length < 40 && !text.match(/\d/) && !text.match(/\b(born|in|at|from|city|country|date|time)\b/i)) {
    result.name = text.trim();
  }

  return result;
}

function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = dateStr.split('-').map(Number);
  if (y < 1900 || y > new Date().getFullYear()) return false;
  if (m < 1 || m > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}

function isValidTime(timeStr: string): boolean {
  const [h, m] = timeStr.split(':').map(Number);
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT: Fixed prompt for direct LLM use
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get the raw system prompt for use in external agent frameworks.
 */
export function getOnboardingSystemPrompt(): string {
  return ONBOARDING_SYSTEM_PROMPT;
}

/**
 * Build the initial welcome turn for a fresh session.
 */
export function buildWelcomeTurn(): OnboardingTurn {
  const state = createOnboardingSession();
  const agentText = buildAgentResponse(state);
  state.history.push({ role: 'agent', text: agentText });
  return {
    system: ONBOARDING_SYSTEM_PROMPT,
    user: `Current step: welcome\n\nRespond with the opening welcome message.`,
    state,
    ready: false,
  };
}

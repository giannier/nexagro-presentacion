import {
  validateContact,
  type Contact,
  type ContactErrors,
  type ContactInput,
} from '@/features/contacts/domain/contact';

/**
 * Port: wherever contacts end up living.
 *
 * The use case only knows this interface. Swapping Google Sheets for a database, a CRM
 * or anything else means writing one new adapter — nothing in the form or the route
 * changes.
 */
export interface ContactRepository {
  save(contact: Contact): Promise<void>;
}

export type RegisterContactResult =
  | { readonly status: 'saved'; readonly contact: Contact }
  | { readonly status: 'invalid'; readonly errors: ContactErrors }
  | { readonly status: 'failed'; readonly reason: string };

export async function registerContact(
  input: ContactInput,
  repository: ContactRepository,
): Promise<RegisterContactResult> {
  const validation = validateContact(input);
  if (!validation.ok) return { status: 'invalid', errors: validation.errors };

  try {
    await repository.save(validation.contact);
    return { status: 'saved', contact: validation.contact };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Unknown storage error',
    };
  }
}

/**
 * Validation for the new-project form, kept pure and separate from the server
 * action so it can be tested without auth or a database.
 *
 * Messages are the ones a roofer reads. They name the thing to do, not the rule
 * that was broken ("Add the city.", not "city is required") — PRODUCT.md asks
 * for the trade's language, and a validation message is still copy.
 */
export type NewProjectFields = {
  name: string;
  clientName: string;
  addressLine1: string;
  city: string;
  province: string;
};

export function validateNewProject(fields: NewProjectFields): Record<string, string> {
  const errors: Record<string, string> = {};
  // Every field is checked before returning, so a roofer fixes all of them in
  // one pass instead of rediscovering them one submit at a time.
  if (!fields.name) errors.name = "Give this job a name so you can find it later.";
  if (!fields.clientName) errors.clientName = "Who is this job for?";
  if (!fields.addressLine1) errors.addressLine1 = "Add the street address of the roof.";
  if (!fields.city) errors.city = "Add the city.";
  if (!fields.province) errors.province = "Add the province.";
  return errors;
}

"use server";

import path from "path";
import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Trade } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/auth";
import { isStripeConfigured, stripeClient } from "@/lib/stripe";
import { storage } from "@/lib/storage";
import { resetCompanyCatalog } from "@/lib/company-setup";
import { PROVINCE_OPTIONS, TRADE_OPTIONS } from "@/lib/trade-catalog";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function originFromHeaders() {
  const host = (await headers()).get("host") ?? "localhost:3000";
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
}

/**
 * Contractor identity: legal name, contact details, licence/business/WCB
 * numbers, address. All optional except `name` — a contractor signs up and
 * starts working, and `lib/invoice/gaps.ts` asks for the business number at
 * the point it's actually needed rather than up front here.
 */
export async function updateCompanyProfileAction(formData: FormData) {
  const { company } = await requireCapability("manageCompany");

  const name = getString(formData, "name");
  if (!name) throw new Error("Give the company a name.");

  const trade = getString(formData, "trade");
  if (!TRADE_OPTIONS.some((t) => t.value === trade)) {
    throw new Error("Pick a trade from the list.");
  }
  const province = getString(formData, "province");
  if (province && !PROVINCE_OPTIONS.some((p) => p.value === province)) {
    throw new Error("Pick a province from the list.");
  }

  await prisma.company.update({
    where: { id: company.id },
    data: {
      name,
      trade: trade as Trade,
      legalName: getString(formData, "legalName") || null,
      phone: getString(formData, "phone") || null,
      email: getString(formData, "email") || null,
      addressLine1: getString(formData, "addressLine1") || null,
      city: getString(formData, "city") || null,
      province: province || null,
      postalCode: getString(formData, "postalCode") || null,
      licenceNumber: getString(formData, "licenceNumber") || null,
      businessNumber: getString(formData, "businessNumber") || null,
      wcbNumber: getString(formData, "wcbNumber") || null,
      reviewUrl: getString(formData, "reviewUrl") || null,
    },
  });

  revalidatePath("/settings");
}

/**
 * The explicit, separate counterpart to the profile save above — changing
 * `trade`/`province` there never touches a single `Service`/`TaxRate` row
 * (see `provisionCompanyCatalog`'s own "never touch existing rows" rule).
 * This is the deliberate, confirmed action for a company that actually wants
 * a clean slate for whatever trade/province is *currently saved* — same
 * mechanism `/onboarding` uses unconditionally on day zero, gated here
 * behind `ConfirmSubmit` since real time may have passed and real edits may
 * exist.
 */
export async function resetCompanyCatalogAction() {
  const { company } = await requireCapability("manageCompany");
  await resetCompanyCatalog(company.id, { trade: company.trade, province: company.province });
  revalidatePath("/settings");
}

export type UploadLogoResult = { url?: string; error?: string };

/** Comfortably above a browser-downscaled photo, well under what a phone shoots. */
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/**
 * The bytes go up the moment the owner picks the file, same shape as
 * `uploadQuoteLinePhotoAction` — a logo has no draft state to hold it in, so
 * there's nothing to wait for a second Save on.
 */
export async function uploadCompanyLogoAction(formData: FormData): Promise<UploadLogoResult> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "That image is too big. Try one taken at a smaller size." };
  }

  const { company } = await requireCapability("manageCompany");

  const extension = path.extname(file.name).toLowerCase() || ".jpg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const { url } = await storage.put(
    `companies/${company.id}/logo-${randomUUID()}${extension}`,
    bytes,
    file.type
  );

  await prisma.company.update({ where: { id: company.id }, data: { logoUrl: url } });
  revalidatePath("/settings");

  return { url };
}

export async function removeCompanyLogoAction() {
  const { company } = await requireCapability("manageCompany");
  await prisma.company.update({ where: { id: company.id }, data: { logoUrl: null } });
  revalidatePath("/settings");
}

/**
 * Send the owner to Stripe's own onboarding form — the same "Verification by
 * Stripe" flow Jobber uses, and for the same reason: collecting a photo ID and
 * a business's SSN/EIN (or SIN/BN) ourselves is a KYC burden Aernova has no
 * business taking on for an Express account when Stripe already built the form.
 * `business_type` is left unset on purpose so Stripe's own form asks the
 * contractor "individual or company" — most roofers are a sole proprietorship,
 * and that is Stripe's question to ask, not a default we should guess for them.
 *
 * Creates the Stripe account once and reuses it forever after. Re-running this
 * action — an interrupted onboarding, a "continue setup" click — must never
 * mint a second Stripe account for the same company; only the account link
 * (which does expire) gets minted fresh every time.
 */
export async function connectStripeAction() {
  const { company } = await requireCapability("manageBilling");
  if (!isStripeConfigured()) {
    throw new Error("Payments aren't set up in this environment yet.");
  }

  const stripe = stripeClient();
  const origin = await originFromHeaders();

  let accountId = company.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: company.email ?? undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeAccountId: accountId },
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/settings?stripe=refresh`,
    return_url: `${origin}/settings?stripe=return`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}

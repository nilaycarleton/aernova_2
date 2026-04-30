"use server";

import { redirect } from "next/navigation";
import { CaptureSource, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDemoContext } from "@/lib/demo-context";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createProjectAction(formData: FormData) {
  const { company, user } = await getDemoContext();

  const name = getString(formData, "name");
  const clientName = getString(formData, "clientName");
  const clientEmail = getString(formData, "clientEmail");
  const clientPhone = getString(formData, "clientPhone");
  const addressLine1 = getString(formData, "addressLine1");
  const city = getString(formData, "city");
  const province = getString(formData, "province");
  const postalCode = getString(formData, "postalCode");
  const notes = getString(formData, "notes");
  const captureSourceRaw = getString(formData, "captureSource");

  if (!name) {
    throw new Error("Project name is required.");
  }

  if (!clientName) {
    throw new Error("Client name is required.");
  }

  if (!addressLine1) {
    throw new Error("Address is required.");
  }

  if (!city) {
    throw new Error("City is required.");
  }

  if (!province) {
    throw new Error("Province is required.");
  }

  const allowedSources = new Set(["DRONE", "SATELLITE", "MANUAL"]);
  const captureSource = allowedSources.has(captureSourceRaw)
    ? (captureSourceRaw as CaptureSource)
    : CaptureSource.MANUAL;

  const project = await prisma.project.create({
    data: {
      companyId: company.id,
      createdById: user.id,
      name,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      status: ProjectStatus.LEAD,
      captureSource,
      addressLine1,
      city,
      province,
      postalCode: postalCode || null,
      country: "Canada",
      notes: notes || null,
    },
  });

  redirect(`/projects/${project.id}`);
}
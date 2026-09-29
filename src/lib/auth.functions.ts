import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { TablesUpdate } from "@/integrations/supabase/types";

export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const { data: roles, error: rolesError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    const email = (context.claims as any)?.email ?? null;

    return { profile: data, email, roles: roles?.map((r: { role: string }) => r.role) ?? [] };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").optional(),
        phone: z.string().optional(),
        birthDate: z.string().optional(),
        document: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const updateData: TablesUpdate<"profiles"> = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.birthDate !== undefined) updateData.birth_date = data.birthDate;
    if (data.document !== undefined) updateData.document = data.document;

    const { error } = await context.supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", context.userId);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

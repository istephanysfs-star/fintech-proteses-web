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

export const getAllUsersForAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");

    // We now use an RPC function instead of service_role_key fetch which fails in Lovable Edge Proxy
    const { data: users, error } = await context.supabase.rpc("get_all_users_for_admin");

    if (error) {
      throw new Error(error.message);
    }

    return { users: users || [] };
  });

export const updateUserRoleForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid(),
        newRole: z.enum(["patient", "clinic", "admin"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");

    // Call the RPC to update roles securely without needing service role keys
    const { error } = await context.supabase.rpc("update_user_role_by_admin", {
      target_user_id: data.targetUserId,
      new_role: data.newRole,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteUserByAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ targetUserId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    // Check if user is admin
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    const metaRole = (context.claims?.user_metadata as any)?.role;
    const isAdmin =
      roles?.some((r: any) => r.role === "admin") ||
      profile?.role === "admin" ||
      metaRole === "admin";
    if (!isAdmin) throw new Error("Unauthorized");

    // Call the RPC
    const { error } = await context.supabase.rpc("delete_user_by_admin", {
      target_user_id: data.targetUserId,
    });

    if (error) throw new Error(error.message);

    return { ok: true };
  });

export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("delete_own_account");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { applicationId } = await req.json();

    if (!applicationId) {
      throw new Error("applicationId é obrigatório");
    }

    const { data: app, error } = await supabaseClient
      .from("loan_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (error || !app) {
      throw new Error("Proposta não encontrada");
    }

    // Regra de análise automática de crédito
    const approved = app.requested_amount <= 50000 && app.down_payment >= app.requested_amount * 0.1;
    const newStatus = approved ? "approved" : "pending";
    const notes = approved
      ? "Aprovado automaticamente pelo sistema de crédito via Supabase Edge Function."
      : "Encaminhado para análise manual detalhada pela equipe técnica.";

    await supabaseClient
      .from("loan_applications")
      .update({
        status: newStatus,
        notes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    return new Response(
      JSON.stringify({ success: true, applicationId, status: newStatus, notes }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

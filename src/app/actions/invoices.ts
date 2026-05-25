"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createManualInvoice(
  businessId: string,
  formData: FormData
): Promise<{ error?: string; id?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const business = await getBusinessById(businessId, userId);
    if (!business) return { error: "Negocio no encontrado" };

    const customer_email = (formData.get("customer_email") as string)?.trim();
    if (!customer_email) return { error: "El email del cliente es requerido" };

    const product_id = (formData.get("product_id") as string)?.trim() || null;
    const description = (formData.get("description") as string)?.trim() || null;
    const amountRaw = formData.get("amount") as string;
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount < 0) return { error: "Importe inválido" };
    const currency = ((formData.get("currency") as string) || "USD").toUpperCase();
    const due_date = (formData.get("due_date") as string)?.trim() || null;

    const supabase = createAdminClient();

    // Generate FAC-YYYY-NNNN: count existing invoices for this business in current year
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01T00:00:00.000Z`;
    const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

    const { count, error: countError } = await supabase
      .from("manual_invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", yearStart)
      .lt("created_at", yearEnd);

    if (countError && countError.code === "42P01") {
      return { error: "La tabla manual_invoices no existe. Ejecuta la migración primero." };
    }

    const seq = ((count ?? 0) + 1).toString().padStart(4, "0");
    const invoice_number = `FAC-${year}-${seq}`;

    const { data, error: insertError } = await supabase
      .from("manual_invoices")
      .insert({
        business_id: businessId,
        product_id: product_id || null,
        customer_email,
        description,
        amount,
        currency,
        status: "sent",
        due_date: due_date || null,
        invoice_number,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[createManualInvoice] insert error:", insertError);
      if (insertError.code === "42P01") {
        return { error: "La tabla manual_invoices no existe. Ejecuta la migración primero." };
      }
      return { error: "Error al crear la factura" };
    }

    return { id: (data as { id: string }).id };
  } catch (err) {
    console.error("[createManualInvoice] unexpected error:", err);
    return { error: "Error inesperado al crear la factura" };
  }
}

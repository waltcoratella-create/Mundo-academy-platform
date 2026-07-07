import { Rocket } from "lucide-react";

/**
 * Amber banner shown while campaigns are stuck in Borrador because no payment
 * method is configured. Hidden entirely once billing is set up.
 */
export function BillingBanner({ onConfigure }: { onConfigure?: string }) {
  return (
    <div className="ads-banner">
      <div className="ads-banner__body">
        <Rocket size={20} strokeWidth={2} color="var(--amber-11, #8A6D0B)" style={{ flexShrink: 0, marginTop: "1px" }} />
        <div>
          <div className="ads-banner__title">Configura la facturación para lanzar tus campañas en borrador</div>
          <div className="ads-banner__text">
            Tus campañas están guardadas como borradores. Agrega un método de pago para lanzarlas.
          </div>
        </div>
      </div>
      {onConfigure ? (
        <a href={onConfigure} className="ads-banner__btn">Configurar facturación</a>
      ) : (
        <button type="button" className="ads-banner__btn">Configurar facturación</button>
      )}
    </div>
  );
}

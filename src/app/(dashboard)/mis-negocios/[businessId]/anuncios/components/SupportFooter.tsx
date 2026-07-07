import Link from "next/link";
import { MessageCircle } from "lucide-react";

/** Bottom support card with a subtle top border. */
export function SupportFooter({ chatHref }: { chatHref: string }) {
  return (
    <div className="ads-support">
      <div>
        <div className="ads-support__title">¿Necesitas ayuda con tus campañas?</div>
        <div className="ads-support__text">Nuestro equipo de soporte está aquí para ayudarte.</div>
      </div>
      <Link href={chatHref} className="ads-support__btn">
        <MessageCircle size={16} strokeWidth={2} />
        Iniciar chat de soporte
      </Link>
    </div>
  );
}

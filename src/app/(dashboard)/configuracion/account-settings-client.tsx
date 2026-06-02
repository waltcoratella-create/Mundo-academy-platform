"use client";

import { useState, useTransition } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  Camera,
  LogOut,
  CheckCircle,
  AlertCircle,
  UserCircle,
  Users,
  Link2,
  ShieldCheck,
  ShoppingBag,
  Bell,
  CreditCard,
  Scale,
  Settings,
} from "lucide-react";
import { updateUserProfile } from "./actions";
import type { UserProfileData } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClerkData {
  id: string;
  fullName: string | null;
  imageUrl: string | null;
  email: string | null;
}

interface Props {
  clerkData: ClerkData;
  initialProfile: UserProfileData | null;
}

type Section =
  | "perfil"
  | "invitaciones"
  | "cuentas-conectadas"
  | "seguridad"
  | "pedidos"
  | "notificaciones"
  | "metodos-pago"
  | "resolucion";

const NAV_ITEMS: Array<{ key: Section; label: string; icon: React.ElementType }> = [
  { key: "perfil",             label: "Editar perfil",          icon: UserCircle  },
  { key: "invitaciones",       label: "Invitaciones",           icon: Users       },
  { key: "cuentas-conectadas", label: "Cuentas conectadas",     icon: Link2       },
  { key: "seguridad",          label: "Seguridad de la cuenta", icon: ShieldCheck },
  { key: "pedidos",            label: "Pedidos",                icon: ShoppingBag },
  { key: "notificaciones",     label: "Notificaciones",         icon: Bell        },
  { key: "metodos-pago",       label: "Métodos de pago",        icon: CreditCard  },
  { key: "resolucion",         label: "Centro de resolución",   icon: Scale       },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-600",
];
function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Main component ────────────────────────────────────────────────────────────

export function AccountSettingsClient({ clerkData, initialProfile }: Props) {
  const { signOut } = useClerk();
  const [section, setSection] = useState<Section>("perfil");

  async function handleSignOut() {
    await signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6 lg:gap-8">

          {/* ── Sidebar ── */}
          <aside className="hidden md:flex w-56 shrink-0 flex-col gap-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-3">
              Mi cuenta
            </p>

            <nav className="flex-1 space-y-0.5">
              {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    section === key
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-4 border-t border-gray-200 pt-3">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </aside>

          {/* ── Main panel ── */}
          <main className="flex-1 min-w-0">
            {section === "perfil" ? (
              <EditProfilePanel clerkData={clerkData} initialProfile={initialProfile} />
            ) : (
              <PlaceholderPanel label={NAV_ITEMS.find((i) => i.key === section)?.label ?? ""} />
            )}
          </main>

        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Panel ────────────────────────────────────────────────────────

function EditProfilePanel({
  clerkData,
  initialProfile,
}: {
  clerkData: ClerkData;
  initialProfile: UserProfileData | null;
}) {
  const p = initialProfile;

  // Seed form state from profile (or Clerk fallback)
  const seedName = p?.display_name ?? clerkData.fullName ?? "";
  const seedUser = p?.username ?? "";
  const seedBio  = p?.bio ?? "";
  const seedAvatar = p?.avatar_url ?? clerkData.imageUrl ?? null;

  // Birth date
  const [bYear, bMonth, bDay] = (p?.birth_date ?? "").split("-");
  const [birthYear,  setBirthYear]  = useState(bYear  ?? "");
  const [birthMonth, setBirthMonth] = useState(bMonth ?? "");
  const [birthDay,   setBirthDay]   = useState(bDay   ?? "");

  const [displayName, setDisplayName] = useState(seedName);
  const [username,    setUsername]    = useState(seedUser);
  const [bio,         setBio]         = useState(seedBio);

  const [toggles, setToggles] = useState({
    totalEarned:      p?.show_total_earned      ?? true,
    location:         p?.show_location          ?? true,
    ownedBusinesses:  p?.show_owned_businesses  ?? true,
    joinedBusinesses: p?.show_joined_businesses ?? true,
  });

  const [isPending, startTransition] = useTransition();
  const [saveError,  setSaveError]  = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const bg    = avatarColor(clerkData.id);
  const label = initials(displayName || clerkData.fullName || "U");

  function toggleKey(key: keyof typeof toggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);

    const fd = new FormData();
    fd.set("display_name", displayName);
    fd.set("username", username);
    fd.set("bio", bio);

    // Build birth_date only if all 3 parts are filled
    if (birthYear && birthMonth && birthDay) {
      fd.set(
        "birth_date",
        `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      );
    }

    fd.set("show_total_earned",      String(toggles.totalEarned));
    fd.set("show_location",          String(toggles.location));
    fd.set("show_owned_businesses",  String(toggles.ownedBusinesses));
    fd.set("show_joined_businesses", String(toggles.joinedBusinesses));

    startTransition(async () => {
      const result = await updateUserProfile(fd);
      if (result.error) {
        setSaveError(result.error);
      } else {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    });
  }

  const inputCls =
    "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all";

  return (
    <div className="space-y-5">

      {/* ── Card: Cover + avatar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        {/* Cover banner */}
        <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200 group cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-all flex items-center justify-center">
          <Camera className="w-7 h-7 text-gray-400" />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 backdrop-blur-sm text-xs font-medium text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="w-3 h-3" /> Cambiar portada
          </span>
        </div>

        {/* Avatar overlapping cover */}
        <div className="px-5 pb-5">
          <div className="relative -mt-10 mb-4 inline-block">
            <div className="relative w-20 h-20 rounded-full ring-4 ring-white overflow-hidden group cursor-pointer">
              {seedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={seedAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className={`w-full h-full flex items-center justify-center text-white text-2xl font-bold ${bg}`}
                >
                  {label}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Name preview */}
          <p className="text-sm font-semibold text-gray-900">
            {displayName || clerkData.fullName || "Tu nombre"}
          </p>
          {clerkData.email && (
            <p className="text-xs text-gray-400 mt-0.5">{clerkData.email}</p>
          )}
        </div>
      </div>

      {/* ── Card: Form fields ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-900">Información del perfil</h2>

        {/* Display name */}
        <Field label="Nombre" counter={`${displayName.length}/100`}>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 100))}
            placeholder="Tu nombre"
            maxLength={100}
            className={inputCls}
          />
        </Field>

        {/* Username */}
        <Field label="Username" counter={`${username.length}/42`}>
          <div className="flex items-stretch border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
            <span className="flex items-center px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none">
              @
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9._]/g, "")
                    .slice(0, 42)
                )
              }
              placeholder="tu_usuario"
              maxLength={42}
              className="flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white outline-none"
            />
          </div>
        </Field>

        {/* Bio */}
        <Field label="Biografía" counter={`${bio.length}/200`}>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="Cuéntale a la comunidad sobre ti…"
            maxLength={200}
            rows={3}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      {/* ── Card: Birth date ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Fecha de nacimiento</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            No se mostrará públicamente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {[
            { placeholder: "DD",   value: birthDay,   set: setBirthDay,   max: 2, w: "w-16" },
            { placeholder: "MM",   value: birthMonth, set: setBirthMonth, max: 2, w: "w-16" },
            { placeholder: "AAAA", value: birthYear,  set: setBirthYear,  max: 4, w: "w-24" },
          ].map(({ placeholder, value, set, max, w }, i) => (
            <div key={i} className="flex items-center gap-3">
              {i > 0 && <span className="text-gray-300 text-lg">/</span>}
              <input
                type="text"
                inputMode="numeric"
                placeholder={placeholder}
                value={value}
                onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, max))}
                maxLength={max}
                className={`${w} px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-center text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Card: Privacy toggles ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Más detalles</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Elige qué aparece en tu perfil y otras superficies de descubrimiento.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {(
            [
              {
                key: "totalEarned",
                label: "Total ganado",
                desc: "Muestra tus ganancias totales en el perfil",
              },
              {
                key: "location",
                label: "Ubicación",
                desc: "Muestra tu ubicación en el perfil",
              },
              {
                key: "ownedBusinesses",
                label: "Negocios propios",
                desc: "Muestra los negocios que diriges",
              },
              {
                key: "joinedBusinesses",
                label: "Negocios unidos",
                desc: "Muestra los negocios a los que te uniste",
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={toggles[key]}
                onChange={() => toggleKey(key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Save bar ── */}
      <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {saveSuccess && !isPending && (
            <p className="text-sm text-green-600 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Cambios guardados correctamente
            </p>
          )}
          {saveError && (
            <p className="text-sm text-red-600 flex items-center gap-1.5 flex-wrap">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {saveError}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>

    </div>
  );
}

// ── Placeholder panel (for non-implemented sections) ─────────────────────────

function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 py-20 flex flex-col items-center gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Settings className="w-6 h-6 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
          Esta sección estará disponible próximamente.
        </p>
      </div>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label,
  counter,
  children,
}: {
  label: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {counter && <span className="text-xs text-gray-400">{counter}</span>}
      </div>
      {children}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

#!/usr/bin/env bash
# Ruflo — Mundo Academy Platform installer
# Usage:
#   curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.sh | bash
#   curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.sh | bash instalar

set -euo pipefail

# ─── Constants ────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/waltcoratella-create/mundo-academy-platform"
APP_NAME="mundo-academy"
INSTALL_DIR="${MUNDO_INSTALL_DIR:-$HOME/mundo-academy-platform}"
NODE_MIN_MAJOR=18
LOG_FILE="/tmp/mundo-academy-install.log"

# ─── Colours ──────────────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput &>/dev/null && tput colors &>/dev/null; then
  RED=$(tput setaf 1)  GREEN=$(tput setaf 2)  YELLOW=$(tput setaf 3)
  BLUE=$(tput setaf 4) BOLD=$(tput bold)       RESET=$(tput sgr0)
else
  RED="" GREEN="" YELLOW="" BLUE="" BOLD="" RESET=""
fi

log()     { printf "%s %b%s%b\n" "$(date '+%H:%M:%S')" "$BLUE"   "$*" "$RESET" | tee -a "$LOG_FILE"; }
success() { printf "%s %b%s%b\n" "$(date '+%H:%M:%S')" "$GREEN"  "$*" "$RESET" | tee -a "$LOG_FILE"; }
warn()    { printf "%s %b%s%b\n" "$(date '+%H:%M:%S')" "$YELLOW" "$*" "$RESET" | tee -a "$LOG_FILE"; }
error()   { printf "%s %b%s%b\n" "$(date '+%H:%M:%S')" "$RED"    "$*" "$RESET" | tee -a "$LOG_FILE" >&2; }
die()     { error "$*"; exit 1; }

banner() {
  printf "\n%b" "$BOLD$BLUE"
  printf "╔══════════════════════════════════════════════════╗\n"
  printf "║        🌍  Mundo Academy Platform                ║\n"
  printf "║            powered by Ruflo                      ║\n"
  printf "║                                                  ║\n"
  printf "║  Next.js 14 · Supabase · Clerk · Stripe · IA    ║\n"
  printf "╚══════════════════════════════════════════════════╝\n"
  printf "%b\n" "$RESET"
}

# ─── OS / arch detection ──────────────────────────────────────────────────────
detect_os() {
  OS=""
  ARCH="$(uname -m)"
  case "$(uname -s)" in
    Linux*)  OS="linux"   ;;
    Darwin*) OS="macos"   ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *) die "Sistema operativo no soportado: $(uname -s)" ;;
  esac
  case "$ARCH" in
    x86_64|amd64)  ARCH="amd64"  ;;
    aarch64|arm64) ARCH="arm64"  ;;
    armv7l)        ARCH="armv7"  ;;
    *) warn "Arquitectura no reconocida: $ARCH — continuando." ;;
  esac
  log "Sistema detectado: $OS / $ARCH"
}

# ─── Prerequisites ────────────────────────────────────────────────────────────
check_command() { command -v "$1" &>/dev/null; }

check_node() {
  if ! check_command node; then
    warn "Node.js no encontrado. Instalando via nvm..."
    install_node
    return
  fi
  local major
  major="$(node --version | sed 's/v//' | cut -d. -f1)"
  if [ "$major" -lt "$NODE_MIN_MAJOR" ]; then
    warn "Node.js $(node --version) < v${NODE_MIN_MAJOR} requerido. Actualizando..."
    install_node
  else
    success "Node.js $(node --version) — OK"
  fi
}

install_node() {
  if ! check_command nvm; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    # shellcheck source=/dev/null
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  nvm install --lts && nvm use --lts
  success "Node.js $(node --version) instalado."
}

check_git() {
  if ! check_command git; then
    log "Instalando git..."
    case "$OS" in
      linux)
        if check_command apt-get; then sudo apt-get install -y git
        elif check_command dnf;    then sudo dnf install -y git
        elif check_command yum;    then sudo yum install -y git
        elif check_command pacman; then sudo pacman -Sy --noconfirm git
        else die "Instala git manualmente y vuelve a ejecutar."
        fi ;;
      macos) check_command brew && brew install git || die "Ejecuta: xcode-select --install" ;;
      *) die "Instala git manualmente." ;;
    esac
  fi
  success "git $(git --version | awk '{print $3}') — OK"
}

check_pkg_manager() {
  if check_command pnpm;   then PKG_MGR="pnpm"
  elif check_command yarn; then PKG_MGR="yarn"
  elif check_command npm;  then PKG_MGR="npm"
  else die "No se encontró npm/yarn/pnpm. Instala Node.js primero."
  fi
  success "Package manager: $PKG_MGR"
}

# ─── Core setup ───────────────────────────────────────────────────────────────
clone_or_update() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    log "Instalación existente en $INSTALL_DIR — actualizando..."
    git -C "$INSTALL_DIR" pull --ff-only origin main
    success "Actualizado a la última versión."
  else
    log "Clonando Mundo Academy Platform en $INSTALL_DIR ..."
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    success "Repositorio clonado."
  fi
}

install_deps() {
  log "Instalando dependencias Node.js..."
  ( cd "$INSTALL_DIR" && $PKG_MGR install ) || die "Falló la instalación de dependencias."
  success "Dependencias instaladas."
}

setup_env() {
  local env="$INSTALL_DIR/.env.local"
  local example="$INSTALL_DIR/.env.example"

  if [ -f "$env" ]; then
    success ".env.local ya existe — omitiendo."
    return
  fi

  [ -f "$example" ] && cp "$example" "$env"

  printf "\n%b" "$BOLD$YELLOW"
  printf "╔══════════════════════════════════════════════════╗\n"
  printf "║  ⚙️  Configuración de variables de entorno       ║\n"
  printf "╚══════════════════════════════════════════════════╝\n"
  printf "%b\n" "$RESET"

  printf "Necesitas estas claves para continuar:\n\n"
  printf "  1. %bClerk%b    → https://dashboard.clerk.com\n" "$BOLD" "$RESET"
  printf "  2. %bSupabase%b → https://supabase.com\n" "$BOLD" "$RESET"
  printf "  3. %bStripe%b   → https://dashboard.stripe.com\n" "$BOLD" "$RESET"
  printf "  4. %bAnthropic%b→ https://console.anthropic.com\n\n" "$BOLD" "$RESET"

  read -rp "$(printf '%bClerk Publishable Key:%b ' "$BOLD" "$RESET")" CLERK_PUB
  read -rp "$(printf '%bClerk Secret Key:%b ' "$BOLD" "$RESET")" CLERK_SEC
  read -rp "$(printf '%bSupabase URL:%b ' "$BOLD" "$RESET")" SUPA_URL
  read -rp "$(printf '%bSupabase Anon Key:%b ' "$BOLD" "$RESET")" SUPA_KEY
  read -rp "$(printf '%bStripe Secret Key:%b ' "$BOLD" "$RESET")" STRIPE_SEC
  read -rp "$(printf '%bAnthropic API Key:%b ' "$BOLD" "$RESET")" ANTHROPIC

  {
    printf "NEXT_PUBLIC_APP_URL=http://localhost:3000\n"
    printf "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=%s\n" "$CLERK_PUB"
    printf "CLERK_SECRET_KEY=%s\n" "$CLERK_SEC"
    printf "NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in\n"
    printf "NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up\n"
    printf "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/descubrir\n"
    printf "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/descubrir\n"
    printf "NEXT_PUBLIC_SUPABASE_URL=%s\n" "$SUPA_URL"
    printf "NEXT_PUBLIC_SUPABASE_ANON_KEY=%s\n" "$SUPA_KEY"
    printf "STRIPE_SECRET_KEY=%s\n" "$STRIPE_SEC"
    printf "ANTHROPIC_API_KEY=%s\n" "$ANTHROPIC"
  } > "$env"

  success ".env.local configurado."
}

run_build() {
  log "Verificando build de Next.js..."
  ( cd "$INSTALL_DIR" && $PKG_MGR run build ) && success "Build exitoso." \
    || warn "Build con advertencias — revisa los logs."
}

# ─── Post-install summary ─────────────────────────────────────────────────────
print_summary() {
  printf "\n%b" "$BOLD$GREEN"
  printf "╔══════════════════════════════════════════════════╗\n"
  printf "║  ✅  Instalación completada                      ║\n"
  printf "╚══════════════════════════════════════════════════╝\n"
  printf "%b\n" "$RESET"
  printf "  %bDirectorio:%b  %s\n" "$BOLD" "$RESET" "$INSTALL_DIR"
  printf "  %bLog:%b         %s\n" "$BOLD" "$RESET" "$LOG_FILE"
  printf "\n"
  printf "  Para iniciar en modo desarrollo:\n"
  printf "    %bcd %s && %s run dev%b\n\n" "$BOLD$BLUE" "$INSTALL_DIR" "$PKG_MGR" "$RESET"
  printf "  Para producción (Vercel recomendado):\n"
  printf "    %bvercel --prod%b\n\n" "$BOLD$BLUE" "$RESET"
  printf "  Plataforma disponible en: %bhttp://localhost:3000%b\n\n" "$BOLD" "$RESET"
}

uninstall() {
  warn "Desinstalando Mundo Academy Platform..."
  rm -rf "$INSTALL_DIR"
  success "Desinstalado."
  exit 0
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  local action="${1:-install}"
  local script_name
  script_name="$(basename "$0" 2>/dev/null || echo "install")"
  [ "$script_name" = "instalar" ] && action="install"

  banner

  case "$action" in
    instalar|install|"") log "Iniciando instalación..." ;;
    uninstall|desinstalar) uninstall ;;
    update|actualizar)
      log "Actualizando..."
      clone_or_update
      install_deps
      run_build
      print_summary
      exit 0
      ;;
    --help|-h|help|ayuda)
      printf "Uso: curl -fsSL <url>/install.sh | bash [instalar|desinstalar|actualizar]\n"
      exit 0
      ;;
    *) warn "Comando desconocido '$action' — instalando." ;;
  esac

  rm -f "$LOG_FILE"
  detect_os
  check_git
  check_node
  check_pkg_manager
  clone_or_update
  install_deps
  setup_env
  run_build
  print_summary
}

main "$@"

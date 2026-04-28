#!/usr/bin/env bash
# Ruflo — Mundo Academy Platform installer
# Usage:
#   curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.sh | bash
#   curl -fsSL https://cdn.jsdelivr.net/gh/ruvnet/ruflo@main/scripts/install.sh | bash instalar

set -euo pipefail

# ─── Constants ────────────────────────────────────────────────────────────────
REPO_URL="https://github.com/waltcoratella-create/mundo-academy-platform"
APP_NAME="mundo-academy"
INSTALL_DIR="${MUNDO_INSTALL_DIR:-$HOME/.mundo-academy}"
BIN_DIR="${MUNDO_BIN_DIR:-$HOME/.local/bin}"
NODE_MIN_MAJOR=18
LOG_FILE="/tmp/mundo-academy-install.log"

# ─── Colours ──────────────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput &>/dev/null && tput colors &>/dev/null; then
  RED=$(tput setaf 1)  GREEN=$(tput setaf 2)  YELLOW=$(tput setaf 3)
  BLUE=$(tput setaf 4) BOLD=$(tput bold)       RESET=$(tput sgr0)
else
  RED="" GREEN="" YELLOW="" BLUE="" BOLD="" RESET=""
fi

# ─── Helpers ──────────────────────────────────────────────────────────────────
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
  printf "║  Instalador / Installer  v1.0.0                  ║\n"
  printf "╚══════════════════════════════════════════════════╝\n"
  printf "%b\n" "$RESET"
}

# ─── OS / Arch detection ──────────────────────────────────────────────────────
detect_os() {
  OS=""
  ARCH="$(uname -m)"

  case "$(uname -s)" in
    Linux*)   OS="linux"   ;;
    Darwin*)  OS="macos"   ;;
    MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
    *)        die "Unsupported operating system: $(uname -s)" ;;
  esac

  case "$ARCH" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    armv7l)        ARCH="armv7" ;;
    *) warn "Unrecognised architecture: $ARCH — proceeding anyway." ;;
  esac

  log "Detected OS: $OS / $ARCH"
}

# ─── Prerequisite checks ──────────────────────────────────────────────────────
check_command() {
  command -v "$1" &>/dev/null
}

require_command() {
  check_command "$1" || die "'$1' not found. Please install it and re-run this script."
}

check_node() {
  if ! check_command node; then
    warn "Node.js not found."
    install_node
    return
  fi

  local version
  version="$(node --version 2>/dev/null | sed 's/v//')"
  local major
  major="$(echo "$version" | cut -d. -f1)"

  if [ "$major" -lt "$NODE_MIN_MAJOR" ]; then
    warn "Node.js $version is below the required minimum (v${NODE_MIN_MAJOR})."
    install_node
  else
    success "Node.js $version — OK"
  fi
}

install_node() {
  log "Installing Node.js via nvm..."

  if ! check_command nvm; then
    log "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # shellcheck source=/dev/null
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  nvm install --lts
  nvm use --lts
  success "Node.js $(node --version) installed."
}

check_git() {
  if ! check_command git; then
    log "Git not found — attempting install..."
    case "$OS" in
      linux)
        if check_command apt-get; then sudo apt-get install -y git
        elif check_command dnf;     then sudo dnf install -y git
        elif check_command yum;     then sudo yum install -y git
        elif check_command pacman;  then sudo pacman -Sy --noconfirm git
        else die "Cannot install git automatically. Please install it manually."
        fi ;;
      macos)
        check_command brew && brew install git || die "Please install Xcode Command Line Tools: xcode-select --install" ;;
      *) die "Please install git manually and re-run." ;;
    esac
  fi
  success "git $(git --version | awk '{print $3}') — OK"
}

check_package_manager() {
  if check_command pnpm; then
    PKG_MGR="pnpm"
  elif check_command yarn; then
    PKG_MGR="yarn"
  elif check_command npm; then
    PKG_MGR="npm"
  else
    die "No package manager (npm/yarn/pnpm) found. Please install Node.js first."
  fi
  success "Package manager: $PKG_MGR"
}

# ─── Core installation ────────────────────────────────────────────────────────
clone_or_update() {
  if [ -d "$INSTALL_DIR/.git" ]; then
    log "Existing installation found at $INSTALL_DIR — updating..."
    git -C "$INSTALL_DIR" pull --ff-only origin main
    success "Updated to latest version."
  else
    log "Cloning Mundo Academy Platform into $INSTALL_DIR ..."
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    success "Repository cloned."
  fi
}

install_dependencies() {
  log "Installing Node.js dependencies..."
  ( cd "$INSTALL_DIR" && $PKG_MGR install --frozen-lockfile 2>/dev/null ) \
    || ( cd "$INSTALL_DIR" && $PKG_MGR install )
  success "Dependencies installed."
}

setup_env() {
  local env_file="$INSTALL_DIR/.env"
  local env_example="$INSTALL_DIR/.env.example"

  if [ ! -f "$env_file" ] && [ -f "$env_example" ]; then
    cp "$env_example" "$env_file"
    warn ".env created from .env.example — please review $env_file before starting."
  elif [ ! -f "$env_file" ]; then
    cat > "$env_file" <<'EOF'
# Mundo Academy Platform — Environment Configuration
NODE_ENV=production
PORT=3000
DATABASE_URL=
SECRET_KEY=
EOF
    warn ".env created with defaults — please configure $env_file before starting."
  else
    success ".env already configured."
  fi
}

create_launcher() {
  mkdir -p "$BIN_DIR"
  cat > "$BIN_DIR/$APP_NAME" <<EOF
#!/usr/bin/env bash
# Mundo Academy Platform launcher — generated by Ruflo installer
cd "$INSTALL_DIR"
exec node server.js "\$@"
EOF
  chmod +x "$BIN_DIR/$APP_NAME"

  # Add BIN_DIR to PATH in shell rc files if not already present
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    if [ -f "$rc" ] && ! grep -q "$BIN_DIR" "$rc"; then
      printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$rc"
    fi
  done

  success "Launcher created: $BIN_DIR/$APP_NAME"
}

build_platform() {
  local build_script
  build_script="$(cd "$INSTALL_DIR" && node -e "const p=require('./package.json'); process.stdout.write(p.scripts&&p.scripts.build?'yes':'no')" 2>/dev/null || echo "no")"

  if [ "$build_script" = "yes" ]; then
    log "Building platform assets..."
    ( cd "$INSTALL_DIR" && $PKG_MGR run build )
    success "Build complete."
  fi
}

# ─── Post-install summary ─────────────────────────────────────────────────────
print_summary() {
  printf "\n%b" "$BOLD$GREEN"
  printf "╔══════════════════════════════════════════════════╗\n"
  printf "║  ✅  Instalación / Installation Complete!        ║\n"
  printf "╚══════════════════════════════════════════════════╝\n"
  printf "%b\n" "$RESET"
  printf "  %bInstall dir:%b  %s\n"  "$BOLD" "$RESET" "$INSTALL_DIR"
  printf "  %bLauncher:%b     %s\n"  "$BOLD" "$RESET" "$BIN_DIR/$APP_NAME"
  printf "  %bLog file:%b     %s\n"  "$BOLD" "$RESET" "$LOG_FILE"
  printf "\n"
  printf "  To start the platform:\n"
  printf "    %b%s start%b\n" "$BOLD$BLUE" "$APP_NAME" "$RESET"
  printf "\n"
  printf "  Or from the install directory:\n"
  printf "    %bcd %s && %s run start%b\n" "$BOLD$BLUE" "$INSTALL_DIR" "$PKG_MGR" "$RESET"
  printf "\n"
  printf "  If '%s' is not found, reload your shell:\n" "$APP_NAME"
  printf "    %bsource ~/.bashrc%b   (or ~/.zshrc)\n" "$BOLD" "$RESET"
  printf "\n"
}

# ─── Uninstall ────────────────────────────────────────────────────────────────
uninstall() {
  warn "Uninstalling Mundo Academy Platform..."
  rm -rf "$INSTALL_DIR"
  rm -f  "$BIN_DIR/$APP_NAME"
  success "Uninstalled."
  exit 0
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  # Support: curl ... | bash instalar  (instalar becomes $0)
  #          bash install.sh instalar  (instalar becomes $1)
  local action="${1:-install}"
  local script_name
  script_name="$(basename "$0" 2>/dev/null || echo "install")"
  [ "$script_name" = "instalar" ] && action="install"

  banner

  case "$action" in
    instalar|install|"")
      log "Iniciando instalación / Starting installation..."
      ;;
    uninstall|desinstalar)
      uninstall
      ;;
    update|actualizar)
      log "Actualizando / Updating Mundo Academy Platform..."
      ;;
    --help|-h|help|ayuda)
      printf "Usage:\n"
      printf "  curl -fsSL <url>/install.sh | bash [instalar|desinstalar|actualizar]\n\n"
      printf "Commands:\n"
      printf "  instalar / install      Install the platform (default)\n"
      printf "  desinstalar / uninstall Remove the platform\n"
      printf "  actualizar / update     Update to the latest version\n"
      exit 0
      ;;
    *)
      warn "Unknown command '$action' — defaulting to install."
      ;;
  esac

  rm -f "$LOG_FILE"
  detect_os
  check_git
  check_node
  check_package_manager

  clone_or_update
  install_dependencies
  setup_env
  build_platform
  create_launcher

  print_summary
}

main "$@"

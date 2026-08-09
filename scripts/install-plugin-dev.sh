#!/usr/bin/env bash
# Install agent-sdlc for development in this repository:
# 1. Project skills under .cursor/skills (Desktop + Cloud Agents) — real copies, not symlinks
# 2. Workspace slash command at .cursor/commands/sdlc.md
# 3. User-local plugin at ~/.cursor/plugins/local/agent-sdlc (Desktop reload required)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_SRC="${REPO_ROOT}/skills"
SKILLS_DEST="${REPO_ROOT}/.cursor/skills"
COMMANDS_SRC="${REPO_ROOT}/commands"
COMMANDS_DEST="${REPO_ROOT}/.cursor/commands"
LOCAL_PLUGIN_DIR="${HOME}/.cursor/plugins/local/agent-sdlc"

install_project_skills() {
  mkdir -p "${SKILLS_DEST}"

  for skill_dir in "${SKILLS_SRC}"/*/; do
    skill_name="$(basename "${skill_dir}")"
    dest_path="${SKILLS_DEST}/${skill_name}"

    if [[ -e "${dest_path}" ]]; then
      rm -rf "${dest_path}"
    fi

    cp -a "${skill_dir}" "${dest_path}"
    echo "copied skills/${skill_name} -> .cursor/skills/${skill_name}"
  done
}

install_workspace_commands() {
  mkdir -p "${COMMANDS_DEST}"

  for command_file in "${COMMANDS_SRC}"/*.{md,mdc,markdown,txt}; do
    if [[ ! -f "${command_file}" ]]; then
      continue
    fi

    command_name="$(basename "${command_file}")"
    dest_path="${COMMANDS_DEST}/${command_name}"

    if [[ -L "${dest_path}" ]]; then
      rm "${dest_path}"
    fi

    cp "${command_file}" "${dest_path}"
    echo "copied commands/${command_name} -> .cursor/commands/${command_name}"
  done
}

install_local_plugin() {
  mkdir -p "${HOME}/.cursor/plugins/local"

  if [[ -L "${LOCAL_PLUGIN_DIR}" ]]; then
    rm "${LOCAL_PLUGIN_DIR}"
  fi

  if [[ -e "${LOCAL_PLUGIN_DIR}" && ! -L "${LOCAL_PLUGIN_DIR}" ]]; then
    echo "local plugin path exists and is not a symlink: ${LOCAL_PLUGIN_DIR}" >&2
    echo "remove it manually, then re-run this script." >&2
    exit 1
  fi

  ln -s "${REPO_ROOT}" "${LOCAL_PLUGIN_DIR}"
  echo "linked ${LOCAL_PLUGIN_DIR} -> ${REPO_ROOT}"
}

verify_layout() {
  test -f "${REPO_ROOT}/.cursor-plugin/plugin.json"
  test -f "${REPO_ROOT}/commands/sdlc.md"
  test -f "${SKILLS_DEST}/sdlc/SKILL.md"
  test -f "${COMMANDS_DEST}/sdlc.md"
  test ! -L "${SKILLS_DEST}/sdlc"
  test -f "${LOCAL_PLUGIN_DIR}/.cursor-plugin/plugin.json"
}

main() {
  install_project_skills
  install_workspace_commands
  install_local_plugin
  verify_layout
  echo ""
  echo "agent-sdlc plugin installed for repo development."
  echo "Reload Cursor (Developer: Reload Window) so Desktop picks up the local plugin."
  echo "Slash commands: /sdlc and specialist skills under Customize -> Skills."
}

main "$@"

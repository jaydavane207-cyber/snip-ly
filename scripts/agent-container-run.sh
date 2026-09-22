#!/usr/bin/env bash
# ==============================================================================
# Ephemeral Container Runner for AI Agents (Bash)
# ==============================================================================
set -euo pipefail

IMAGE_NAME="agent-sandbox:node20"
CONTAINER_NAME="agent_ephemeral_sandbox"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/docker-compose.agent.yml"

show_help() {
    echo "Usage: $0 {build|run|respawn|exec|kill}"
    echo ""
    echo "Commands:"
    echo "  build    Build the sandboxed agent Docker image"
    echo "  run      Run an ephemeral container with strict volume permissions (auto-cleans on exit)"
    echo "  respawn  Immediately kill any running agent container and spawn a clean new one"
    echo "  exec     Execute an allowlisted command inside a running container"
    echo "  kill     Immediately terminate and remove any running agent container"
    exit 1
}

build_image() {
    echo "[Agent Sandbox] Building ephemeral agent image: $IMAGE_NAME..."
    docker build -t "$IMAGE_NAME" -f "$REPO_ROOT/docker/Dockerfile.agent" "$REPO_ROOT"
    echo "[Agent Sandbox] Build complete."
}

run_container() {
    echo "[Agent Sandbox] Starting ephemeral container..."
    echo "[Agent Sandbox] Note: Host config files are mounted READ-ONLY."
    echo "[Agent Sandbox] Only app/, lib/, prisma/, public/ are writable."

    # Ensure docker network exists if external network is defined
    docker network inspect project1_default >/dev/null 2>&1 || docker network create project1_default

    # Run with --rm for guaranteed ephemeral cleanup
    docker run --rm -it \
        --name "$CONTAINER_NAME" \
        --cpus="2.0" \
        --memory="2048m" \
        -v "$REPO_ROOT:/workspace:ro" \
        -v "$REPO_ROOT/app:/workspace/app:rw" \
        -v "$REPO_ROOT/lib:/workspace/lib:rw" \
        -v "$REPO_ROOT/prisma:/workspace/prisma:rw" \
        -v "$REPO_ROOT/public:/workspace/public:rw" \
        -v "$REPO_ROOT/.git:/workspace/.git:rw" \
        -v "$REPO_ROOT/node_modules:/workspace/node_modules:ro" \
        -v "$REPO_ROOT/package.json:/workspace/package.json:ro" \
        -v "$REPO_ROOT/tsconfig.json:/workspace/tsconfig.json:ro" \
        -v "$REPO_ROOT/next.config.mjs:/workspace/next.config.mjs:ro" \
        -w /workspace \
        "$IMAGE_NAME" /bin/bash
}

kill_container() {
    echo "[Agent Sandbox] Killing container $CONTAINER_NAME if running..."
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    echo "[Agent Sandbox] Container removed."
}

respawn_container() {
    echo "[Agent Sandbox] Respawning: Resetting agent state to pristine base image in seconds..."
    kill_container
    run_container
}

exec_command() {
    if [ $# -eq 0 ]; then
        echo "Error: No command specified to execute."
        exit 1
    fi
    docker exec -it "$CONTAINER_NAME" /bin/bash -c "$*"
}

case "${1:-help}" in
    build)
        build_image
        ;;
    run)
        build_image
        run_container
        ;;
    respawn)
        respawn_container
        ;;
    kill)
        kill_container
        ;;
    exec)
        shift
        exec_command "$@"
        ;;
    *)
        show_help
        ;;
esac

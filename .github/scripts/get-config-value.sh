#!/bin/bash

# Script pour récupérer une valeur de configuration depuis devsecops.yml
# Usage: ./get-config-value.sh <chemin-vers-la-valeur>
# Exemple: ./get-config-value.sh "deployment.timeout_minutes"

set -e

if [ $# -ne 1 ]; then
    echo "❌ Usage: $0 <chemin-vers-la-valeur>"
    echo "   Exemples:"
    echo "     $0 'deployment.timeout_minutes'"
    echo "     $0 'environments.preprod.url'"
    exit 1
fi

CONFIG_PATH="$1"
CONFIG_FILE="devsecops.yml"

# Vérifier que le fichier de configuration existe
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Fichier de configuration '$CONFIG_FILE' introuvable"
    exit 1
fi

# Utiliser yq pour extraire la valeur (plus robuste que grep/sed)
if command -v yq >/dev/null 2>&1; then
    VALUE=$(yq eval ".$CONFIG_PATH" "$CONFIG_FILE" 2>/dev/null)
    if [ "$VALUE" != "null" ] && [ -n "$VALUE" ]; then
        echo "$VALUE"
        exit 0
    fi
fi

# Fallback avec grep/sed si yq n'est pas disponible
VALUE=$(grep -E "^[[:space:]]*$(echo "$CONFIG_PATH" | sed 's/\./:\n  /g' | sed 's/^/  /' | sed 's/$/:/' | tail -1 | sed 's/://' | sed 's/^[[:space:]]*//'):" "$CONFIG_FILE" | sed 's/.*:[[:space:]]*//' | sed 's/[[:space:]]*$//' | sed 's/^"//' | sed 's/"$//')

if [ -n "$VALUE" ] && [ "$VALUE" != "null" ]; then
    echo "$VALUE"
    exit 0
fi

# Si aucune valeur n'est trouvée, afficher un message d'erreur
echo "❌ Valeur de configuration '$CONFIG_PATH' introuvable dans '$CONFIG_FILE'"
exit 1


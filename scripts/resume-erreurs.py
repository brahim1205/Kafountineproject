#!/usr/bin/env python3
"""Résume les erreurs des logs du backend (lignes JSON) lus sur l'entrée standard.

Écrit le texte de l'alerte sur la sortie standard, rien s'il n'y a aucune erreur.
Les piles d'appels et l'agent utilisateur sont omis : l'e-mail reste court et lisible.
"""
import json
import sys

MAX_DETAILS = 30
LIBELLES = {"error": "Erreur serveur", "client-error": "Erreur navigateur"}


def main() -> None:
    erreurs = []
    for ligne in sys.stdin:
        debut = ligne.find("{")
        if debut < 0:
            continue
        try:
            entree = json.loads(ligne[debut:])
        except ValueError:
            continue
        if isinstance(entree, dict) and entree.get("type") in LIBELLES:
            erreurs.append(entree)
    if not erreurs:
        return
    serveur = sum(1 for e in erreurs if e["type"] == "error")
    print(f"{len(erreurs)} erreur(s) : {serveur} côté serveur, {len(erreurs) - serveur} dans le navigateur.\n")
    for e in erreurs[-MAX_DETAILS:]:
        lieu = e.get("path") or e.get("page") or "?"
        methode = f"{e['method']} " if e.get("method") else ""
        message = str(e.get("message") or e.get("name") or "")[:300]
        print(f"- {LIBELLES[e['type']]} · {methode}{lieu} · rôle {e.get('role') or '-'} · requête {e.get('requestId') or '-'}")
        print(f"  {message}")
    if len(erreurs) > MAX_DETAILS:
        print(f"\n… et {len(erreurs) - MAX_DETAILS} autre(s), plus anciennes.")


if __name__ == "__main__":
    main()

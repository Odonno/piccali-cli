# language: fr

@localisation @feat:90001
Fonctionnalité: Recherche de contrats par immatriculation

  Contexte:
    Étant donné un véhicule immatriculé "AB-123-CD"
    Et un contrat "22815092700" associé à ce véhicule

  Scénario: Recherche par immatriculation existante
    Quand je saisis l'immatriculation "AB-123-CD"
    Et je clique sur le bouton "rechercher"
    Alors le contrat "22815092700" est affiché
    Et la carte de services suivante est visible:
      | Service            | État      | Ajouté par   | Date       |
      | DRIVER PROTECTION  | actif     | Anonyme      | 24/10/2023 |
      | GLOBAL ROADSIDE    | suspendu  | Jérôme Dupû  | 31/12/2023 |

  Scénario: Recherche sans résultat
    Quand je saisis l'immatriculation "ZZ-999-ZZ"
    Et je clique sur le bouton "rechercher"
    Mais aucun contrat n'est trouvé
    Alors le message "Aucun contrat trouvé pour cette immatriculation" est affiché

  @plan @feat:90002
  Plan du scénario: Recherche avec des caractères accentués
    Quand je saisis l'immatriculation "<immatriculation>"
    Alors le résultat de la recherche est "<résultat>"

    Exemples:
      | immatriculation | résultat            |
      | AB-123-CD       | trouvé              |
      | ÀÇ-ÉÎ-ÔÛ        | trouvé              |
      | ab-123-cd       | trouvé (insensible) |
      | éà-456-ü        | non trouvé          |

  Scénario: Détail de l'audit
    Alors la piste d'audit de la carte contient:
      """
      ## Piste d'audit

      | Champ       | Valeur      |
      |-------------|-------------|
      | Action      | `ajouté`    |
      | Effectué par | `Anonyme`  |
      | Date        | `24/10/2023` |

      > La date est toujours au format `JJ/MM/AAAA`.
      """

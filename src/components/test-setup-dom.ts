// Nettoyage automatique du DOM après chaque test composant.
// Ce fichier est inerte dans l'environnement node (cleanup ne fait rien sans DOM).
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

"use server";
// Wrappers server actions pour les actions sur les pièces de facture.
// Ces fonctions sont appelées depuis le client (DocumentClient) via des actions Next.js ;
// elles délèguent entièrement à la couche pieces pour garder la logique métier centralisée.
import { validerPiece, extournerPiece, annulerPiece } from "./pieces";

/** Valide une pièce BROUILLON (passage à VALIDEE avec numérotation et hash chaîné). */
export async function actionValider(id: string): Promise<void> { await validerPiece(id); }

/** Crée et valide automatiquement la pièce d'extourne d'une pièce VALIDEE. */
export async function actionExtourner(id: string): Promise<void> { await extournerPiece(id); }

/** Annule une pièce BROUILLON (après défaire ses lettrages si nécessaire). */
export async function actionAnnuler(id: string): Promise<void> { await annulerPiece(id); }

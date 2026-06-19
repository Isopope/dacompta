import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const pieces = await p.piece.findMany({
    include: { journal: true, lignes: { orderBy: { ordre: "asc" } } },
    orderBy: { datePiece: "asc" },
  });
  for (const pc of pieces) {
    console.log(`\n=== ${pc.journal.code} ${pc.numeroPiece} (${pc.datePiece.toISOString().slice(0,10)}) statut=${pc.statut}`);
    for (const l of pc.lignes) {
      console.log(`   ${l.compteNumero}  D:${l.debit}  C:${l.credit}  ${l.libelleLigne}`);
    }
  }
  await p.$disconnect();
})();

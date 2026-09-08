/**
 * Vite — et donc Vitest — sert n importe quel fichier comme chaine avec le
 * suffixe `?raw`. C est ce qui permet a un test de lire le README sans
 * importer `node:fs` : le paquet ne depend pas de `@types/node`.
 */
declare module '*?raw' {
  const content: string
  export default content
}

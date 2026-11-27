// `history.length > 1` también se cumple si la entrada anterior es otra web o si la PWA
// se abrió directamente en una subruta. Aquí se anota si ha habido navegación dentro de la app.
const KEY = "estante:in-app-nav";

export function markInAppNavigation(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    // Sin sessionStorage se usa siempre la ruta de respaldo.
  }
}

export function hasInAppHistory(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1" && window.history.length > 1;
  } catch {
    return false;
  }
}

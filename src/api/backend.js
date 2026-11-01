// "selfhosted" = API propia (carpeta server/); cualquier otro valor = Base44 (comportamiento original).
export const SELF_HOSTED = import.meta.env.VITE_BACKEND === "selfhosted";
